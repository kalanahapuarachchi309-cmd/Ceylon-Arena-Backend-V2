import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import { sendSuccess } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { teamService } from "./team.service";

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  return req.user.userId;
};

export const getMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const leaderId = requireUserId(req);
  const team = await teamService.getMyTeam(leaderId);

  return sendSuccess(res, StatusCodes.OK, "My team fetched successfully", team);
});

export const updateMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const leaderId = requireUserId(req);
  const team = await teamService.updateMyTeam(leaderId, req.body);

  return sendSuccess(res, StatusCodes.OK, "My team updated successfully", team);
});

export const listTeams = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  };

  const result = await teamService.listTeams({
    page: Number(query.page),
    limit: Number(query.limit),
    search: query.search,
    isActive: query.isActive
  });

  return sendSuccess(res, StatusCodes.OK, "Teams fetched successfully", result);
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.getTeamById(String(req.params.id));

  return sendSuccess(res, StatusCodes.OK, "Team fetched successfully", team);
});
