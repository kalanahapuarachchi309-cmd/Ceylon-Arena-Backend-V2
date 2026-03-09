import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { eventService } from "./event.service";

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  return req.user;
};

export const listPublicEvents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    page: number;
    limit: number;
    gameName?: string;
    search?: string;
  };

  const result = await eventService.listPublicEvents({
    page: Number(query.page),
    limit: Number(query.limit),
    gameName: query.gameName,
    search: query.search
  });

  return sendSuccess(res, StatusCodes.OK, "Public events fetched successfully", result);
});

export const getPublicEventBySlug = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getPublicEventBySlug(String(req.params.slug));

  return sendSuccess(res, StatusCodes.OK, "Public event fetched successfully", event);
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const event = await eventService.createEvent(user.userId, req.body);

  return sendSuccess(res, StatusCodes.CREATED, "Event created successfully", event);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const event = await eventService.updateEvent(String(req.params.id), user.userId, req.body);

  return sendSuccess(res, StatusCodes.OK, "Event updated successfully", event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const event = await eventService.deleteEvent(String(req.params.id), user.userId);

  return sendSuccess(res, StatusCodes.OK, "Event deleted successfully", event);
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as {
    page: number;
    limit: number;
    status?: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED" | "CANCELLED";
    gameName?: string;
    search?: string;
  };

  const result = await eventService.listEvents(user.role, {
    page: Number(query.page),
    limit: Number(query.limit),
    status: query.status,
    gameName: query.gameName,
    search: query.search
  });

  return sendSuccess(res, StatusCodes.OK, "Events fetched successfully", result);
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const event = await eventService.getEventById(String(req.params.id), user.role);

  return sendSuccess(res, StatusCodes.OK, "Event fetched successfully", event);
});
