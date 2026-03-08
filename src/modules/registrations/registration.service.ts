import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import {
  EVENT_STATUS,
  REGISTRATION_STATUS,
  USER_ROLES,
  type RegistrationStatus,
  type UserRole
} from "../../constants";
import { ApiError } from "../../utils/ApiError";
import { EventModel } from "../events/event.model";
import { TeamModel } from "../teams/team.model";
import { EventRegistrationModel } from "./registration.model";

interface ListRegistrationsInput {
  page: number;
  limit: number;
  status?: RegistrationStatus;
  eventId?: string;
}

const countableStatuses = new Set<RegistrationStatus>([
  REGISTRATION_STATUS.PENDING_PAYMENT,
  REGISTRATION_STATUS.PAYMENT_SUBMITTED,
  REGISTRATION_STATUS.CONFIRMED
]);

const allowedTransitions: Record<RegistrationStatus, RegistrationStatus[]> = {
  [REGISTRATION_STATUS.PENDING_PAYMENT]: [
    REGISTRATION_STATUS.PAYMENT_SUBMITTED,
    REGISTRATION_STATUS.REJECTED,
    REGISTRATION_STATUS.CANCELLED
  ],
  [REGISTRATION_STATUS.PAYMENT_SUBMITTED]: [
    REGISTRATION_STATUS.CONFIRMED,
    REGISTRATION_STATUS.REJECTED,
    REGISTRATION_STATUS.CANCELLED
  ],
  [REGISTRATION_STATUS.CONFIRMED]: [REGISTRATION_STATUS.CANCELLED],
  [REGISTRATION_STATUS.REJECTED]: [],
  [REGISTRATION_STATUS.CANCELLED]: []
};

const getStatusCountDelta = (
  previousStatus: RegistrationStatus,
  nextStatus: RegistrationStatus
): number => {
  const wasCounted = countableStatuses.has(previousStatus);
  const isCounted = countableStatuses.has(nextStatus);

  if (wasCounted && !isCounted) {
    return -1;
  }

  if (!wasCounted && isCounted) {
    return 1;
  }

  return 0;
};

export const updateEventRegisteredTeamsCount = async (
  eventId: mongoose.Types.ObjectId,
  delta: number,
  session?: mongoose.ClientSession
): Promise<void> => {
  if (delta === 0) {
    return;
  }

  const event = await EventModel.findById(eventId).session(session ?? null).exec();

  if (!event) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
  }

  event.registeredTeamsCount = Math.max(0, event.registeredTeamsCount + delta);
  await event.save({ session });
};

export const registrationService = {
  registerForEvent: async (leaderId: string, eventId: string) => {
    const team = await TeamModel.findOne({ leaderId, isActive: true }).lean();

    if (!team) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Leader must have an active team");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const event = await EventModel.findOne({
        _id: eventId,
        isDeleted: false
      })
        .session(session)
        .exec();

      if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
      }

      const registrationOpenStatuses = new Set<string>([
        EVENT_STATUS.ACTIVE,
        EVENT_STATUS.PUBLISHED
      ]);

      if (!registrationOpenStatuses.has(event.status)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Registrations are only allowed for ACTIVE or PUBLISHED events"
        );
      }

      const now = new Date();
      if (event.registrationOpenAt > now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Registration has not opened yet");
      }

      if (event.registrationCloseAt < now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Registration deadline has passed");
      }

      if (event.maxTeams && event.registeredTeamsCount >= event.maxTeams) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Event registration limit reached");
      }

      const existing = await EventRegistrationModel.findOne({
        teamId: team._id,
        eventId: event._id
      })
        .session(session)
        .lean();

      if (existing) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "This team is already registered for the selected event"
        );
      }

      const [registration] = await EventRegistrationModel.create(
        [
          {
            teamId: team._id,
            leaderId,
            eventId: event._id,
            status: REGISTRATION_STATUS.PENDING_PAYMENT,
            registeredAt: new Date()
          }
        ],
        { session }
      );

      event.registeredTeamsCount += 1;
      await event.save({ session });

      await session.commitTransaction();

      return registration.toObject();
    } catch (error) {
      await session.abortTransaction();
      if (
        error instanceof mongoose.Error &&
        "code" in error &&
        Number((error as mongoose.Error & { code?: number }).code) === 11000
      ) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "This team is already registered for the selected event"
        );
      }

      throw error;
    } finally {
      session.endSession();
    }
  },

  listMyRegistrations: async (leaderId: string, { page, limit }: ListRegistrationsInput) => {
    const skip = (page - 1) * limit;

    const filter = { leaderId };

    const [items, total] = await Promise.all([
      EventRegistrationModel.find(filter)
        .populate({ path: "teamId", select: "_id teamName primaryGame leaderInGameId members" })
        .populate({ path: "eventId", select: "_id title slug gameName entryFee currency status" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventRegistrationModel.countDocuments(filter)
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

  listRegistrations: async ({ page, limit, status, eventId }: ListRegistrationsInput) => {
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      EventRegistrationModel.find(filter)
        .populate({ path: "teamId", select: "_id teamName primaryGame" })
        .populate({ path: "leaderId", select: "_id fullName email phone" })
        .populate({ path: "eventId", select: "_id title slug gameName status" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventRegistrationModel.countDocuments(filter)
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

  getRegistrationById: async (registrationId: string, requester: { userId: string; role: UserRole }) => {
    const filter: Record<string, unknown> = {
      _id: registrationId
    };

    if (requester.role !== USER_ROLES.ADMIN) {
      filter.leaderId = requester.userId;
    }

    const registration = await EventRegistrationModel.findOne(filter)
      .populate({ path: "teamId", select: "_id teamName primaryGame leaderInGameId members" })
      .populate({ path: "eventId", select: "_id title slug gameName entryFee currency status" })
      .populate({ path: "leaderId", select: "_id fullName email phone role" })
      .lean();

    if (!registration) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Registration not found");
    }

    return registration;
  },

  updateRegistrationStatus: async (
    registrationId: string,
    status: RegistrationStatus,
    notes?: string
  ) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const registration = await EventRegistrationModel.findById(registrationId)
        .session(session)
        .exec();

      if (!registration) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Registration not found");
      }

      if (registration.status !== status) {
        const validTargets = allowedTransitions[registration.status];
        if (!validTargets.includes(status)) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Invalid status transition from ${registration.status} to ${status}`
          );
        }

        const delta = getStatusCountDelta(registration.status, status);
        await updateEventRegisteredTeamsCount(registration.eventId, delta, session);
      }

      registration.status = status;

      if (notes !== undefined) {
        registration.notes = notes;
      }

      if (status === REGISTRATION_STATUS.CONFIRMED) {
        registration.approvedAt = new Date();
        registration.rejectedAt = undefined;
      }

      if (status === REGISTRATION_STATUS.REJECTED) {
        registration.rejectedAt = new Date();
        registration.approvedAt = undefined;
      }

      await registration.save({ session });
      await session.commitTransaction();

      return registration.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
};
