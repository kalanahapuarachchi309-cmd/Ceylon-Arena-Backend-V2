import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import { sendSuccess } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { registrationService } from "./registration.service";

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  return req.user;
};

export const createRegistration = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const registration = await registrationService.registerForEvent(
    user.userId,
    req.body.eventId
  );

  return sendSuccess(
    res,
    StatusCodes.CREATED,
    "Event registration created. Payment is pending.",
    registration
  );
});

export const listMyRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as { page: number; limit: number };
  const result = await registrationService.listMyRegistrations(user.userId, {
    page: Number(query.page),
    limit: Number(query.limit)
  });

  return sendSuccess(res, StatusCodes.OK, "My registrations fetched successfully", result);
});

export const getRegistrationById = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const registration = await registrationService.getRegistrationById(String(req.params.id), user);

  return sendSuccess(res, StatusCodes.OK, "Registration fetched successfully", registration);
});

export const listRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    page: number;
    limit: number;
    eventId?: string;
    status?: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  };

  const result = await registrationService.listRegistrations({
    page: Number(query.page),
    limit: Number(query.limit),
    eventId: query.eventId,
    status: query.status
  });

  return sendSuccess(res, StatusCodes.OK, "Registrations fetched successfully", result);
});

export const updateRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
  const registration = await registrationService.updateRegistrationStatus(
    String(req.params.id),
    req.body.status,
    req.body.notes
  );

  return sendSuccess(res, StatusCodes.OK, "Registration status updated successfully", registration);
});
