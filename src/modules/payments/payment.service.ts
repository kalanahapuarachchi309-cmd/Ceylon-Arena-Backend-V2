import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import type { UploadApiResponse } from "cloudinary";
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REGISTRATION_STATUS,
  USER_ROLES,
  type PaymentStatus,
  type UserRole
} from "../../constants";
import { cloudinary } from "../../config/cloudinary";
import { ApiError } from "../../utils/ApiError";
import { EventModel } from "../events/event.model";
import { EventRegistrationModel } from "../registrations/registration.model";
import { updateEventRegisteredTeamsCount } from "../registrations/registration.service";
import { PaymentModel } from "./payment.model";

interface SubmitPaymentInput {
  leaderId: string;
  registrationId: string;
  transactionReference?: string;
  bankName?: string;
  accountHolder?: string;
  slipFile?: Express.Multer.File;
}

interface ListPaymentsInput {
  page: number;
  limit: number;
  status?: PaymentStatus;
  eventId?: string;
}

const uploadSlipToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  const upload = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ceylon-arena/payment-slips"
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Failed to upload payment slip"));
          return;
        }

        resolve(result);
      }
    );

    stream.end(file.buffer);
  });

  return upload.secure_url;
};

const getRegistrationStatusDelta = (
  currentStatus: (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS],
  nextStatus: (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS]
): number => {
  const countedStatuses: Set<string> = new Set([
    REGISTRATION_STATUS.PENDING_PAYMENT,
    REGISTRATION_STATUS.PAYMENT_SUBMITTED,
    REGISTRATION_STATUS.CONFIRMED
  ]);

  const currentIsCounted = countedStatuses.has(currentStatus);
  const nextIsCounted = countedStatuses.has(nextStatus);

  if (currentIsCounted && !nextIsCounted) {
    return -1;
  }

  if (!currentIsCounted && nextIsCounted) {
    return 1;
  }

  return 0;
};

export const paymentService = {
  submitPayment: async ({
    leaderId,
    registrationId,
    transactionReference,
    bankName,
    accountHolder,
    slipFile
  }: SubmitPaymentInput) => {
    if (!slipFile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Payment slip image is required");
    }

    const registration = await EventRegistrationModel.findById(registrationId).exec();
    if (!registration) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Registration not found");
    }

    if (registration.leaderId.toString() !== leaderId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "You can submit payment only for your registrations");
    }

    const blockedRegistrationStatuses = new Set<string>([
      REGISTRATION_STATUS.CONFIRMED,
      REGISTRATION_STATUS.REJECTED,
      REGISTRATION_STATUS.CANCELLED
    ]);

    if (blockedRegistrationStatuses.has(registration.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Cannot submit payment for registration in ${registration.status} status`
      );
    }

    const existingPendingOrApprovedPayment = await PaymentModel.findOne({
      registrationId: registration._id,
      isDeleted: false,
      status: {
        $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.APPROVED]
      }
    }).lean();

    if (existingPendingOrApprovedPayment) {
      if (existingPendingOrApprovedPayment.status === PAYMENT_STATUS.APPROVED) {
        throw new ApiError(StatusCodes.CONFLICT, "Payment is already approved for this registration");
      }

      throw new ApiError(
        StatusCodes.CONFLICT,
        "A pending payment already exists for this registration"
      );
    }

    const event = await EventModel.findById(registration.eventId).lean();
    if (!event || event.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
    }

    const slipUrl = await uploadSlipToCloudinary(slipFile);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [payment] = await PaymentModel.create(
        [
          {
            registrationId: registration._id,
            teamId: registration.teamId,
            leaderId: registration.leaderId,
            eventId: registration.eventId,
            amount: event.entryFee,
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            status: PAYMENT_STATUS.PENDING,
            slipUrl,
            transactionReference,
            bankName,
            accountHolder
          }
        ],
        { session }
      );

      if (registration.status === REGISTRATION_STATUS.PENDING_PAYMENT) {
        registration.status = REGISTRATION_STATUS.PAYMENT_SUBMITTED;
        await registration.save({ session });
      }

      await session.commitTransaction();

      return payment.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  getPaymentById: async (
    paymentId: string,
    requester: { userId: string; role: UserRole }
  ) => {
    const filter: Record<string, unknown> = {
      _id: paymentId,
      isDeleted: false
    };

    if (requester.role !== USER_ROLES.ADMIN) {
      filter.leaderId = requester.userId;
    }

    const payment = await PaymentModel.findOne(filter)
      .populate({ path: "registrationId", select: "_id status eventId teamId leaderId" })
      .populate({ path: "eventId", select: "_id title slug gameName entryFee currency status" })
      .populate({ path: "teamId", select: "_id teamName primaryGame" })
      .populate({ path: "leaderId", select: "_id fullName email phone" })
      .populate({ path: "reviewedBy", select: "_id fullName email" })
      .lean();

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Payment not found");
    }

    return payment;
  },

  listMyPayments: async (leaderId: string, { page, limit }: ListPaymentsInput) => {
    const skip = (page - 1) * limit;

    const filter = {
      leaderId,
      isDeleted: false
    };

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
        .populate({ path: "registrationId", select: "_id status eventId" })
        .populate({ path: "eventId", select: "_id title slug gameName status" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(filter)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  listPayments: async ({ page, limit, status, eventId }: ListPaymentsInput) => {
    const filter: Record<string, unknown> = {
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
        .populate({ path: "registrationId", select: "_id status teamId" })
        .populate({ path: "eventId", select: "_id title slug gameName status" })
        .populate({ path: "teamId", select: "_id teamName" })
        .populate({ path: "leaderId", select: "_id fullName email" })
        .populate({ path: "reviewedBy", select: "_id fullName email" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(filter)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  reviewPayment: async (
    paymentId: string,
    reviewerId: string,
    status: PaymentStatus,
    adminNote?: string
  ) => {
    const reviewableStatuses = new Set<PaymentStatus>([
      PAYMENT_STATUS.APPROVED,
      PAYMENT_STATUS.REJECTED
    ]);

    if (!reviewableStatuses.has(status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Status must be APPROVED or REJECTED");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await PaymentModel.findOne({
        _id: paymentId,
        isDeleted: false
      })
        .session(session)
        .exec();

      if (!payment) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Payment not found");
      }

      if (payment.status !== PAYMENT_STATUS.PENDING) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Only pending payments can be reviewed");
      }

      const registration = await EventRegistrationModel.findById(payment.registrationId)
        .session(session)
        .exec();

      if (!registration) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Related registration not found");
      }

      payment.status = status;
      payment.adminNote = adminNote;
      payment.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
      payment.reviewedAt = new Date();

      const previousRegistrationStatus = registration.status;
      const nextRegistrationStatus =
        status === PAYMENT_STATUS.APPROVED
          ? REGISTRATION_STATUS.CONFIRMED
          : REGISTRATION_STATUS.REJECTED;

      registration.status = nextRegistrationStatus;

      if (nextRegistrationStatus === REGISTRATION_STATUS.CONFIRMED) {
        registration.approvedAt = new Date();
        registration.rejectedAt = undefined;
      } else {
        registration.rejectedAt = new Date();
      }

      const delta = getRegistrationStatusDelta(
        previousRegistrationStatus,
        nextRegistrationStatus
      );
      await updateEventRegisteredTeamsCount(registration.eventId, delta, session);

      await payment.save({ session });
      await registration.save({ session });
      await session.commitTransaction();

      return payment.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  deletePayment: async (paymentId: string) => {
    const payment = await PaymentModel.findOne({
      _id: paymentId,
      isDeleted: false
    }).exec();

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Payment not found");
    }

    if (payment.status === PAYMENT_STATUS.APPROVED) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Approved payments cannot be deleted for audit integrity"
      );
    }

    payment.isDeleted = true;
    await payment.save();

    return payment.toObject();
  }
};
