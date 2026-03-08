import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import { sendSuccess } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { paymentService } from "./payment.service";

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  return req.user;
};

export const submitPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);

  const payment = await paymentService.submitPayment({
    leaderId: user.userId,
    registrationId: String(req.params.registrationId),
    transactionReference: req.body.transactionReference,
    bankName: req.body.bankName,
    accountHolder: req.body.accountHolder,
    slipFile: req.file
  });

  return sendSuccess(
    res,
    StatusCodes.CREATED,
    "Payment submitted and pending admin review",
    payment
  );
});

export const listMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as { page: number; limit: number };

  const result = await paymentService.listMyPayments(user.userId, {
    page: Number(query.page),
    limit: Number(query.limit)
  });

  return sendSuccess(res, StatusCodes.OK, "My payments fetched successfully", result);
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);

  const payment = await paymentService.getPaymentById(String(req.params.id), user);

  return sendSuccess(res, StatusCodes.OK, "Payment fetched successfully", payment);
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    page: number;
    limit: number;
    status?: "PENDING" | "APPROVED" | "REJECTED";
    eventId?: string;
  };

  const result = await paymentService.listPayments({
    page: Number(query.page),
    limit: Number(query.limit),
    status: query.status,
    eventId: query.eventId
  });

  return sendSuccess(res, StatusCodes.OK, "Payments fetched successfully", result);
});

export const reviewPayment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);

  const payment = await paymentService.reviewPayment(
    String(req.params.id),
    user.userId,
    req.body.status,
    req.body.adminNote
  );

  return sendSuccess(res, StatusCodes.OK, "Payment reviewed successfully", payment);
});

export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.deletePayment(String(req.params.id));

  return sendSuccess(res, StatusCodes.OK, "Payment deleted successfully", payment);
});
