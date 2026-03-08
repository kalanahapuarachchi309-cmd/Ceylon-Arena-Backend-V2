import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { userService } from "./user.service";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    page: number;
    limit: number;
    role?: "ADMIN" | "PLAYER";
    isActive?: boolean;
  };

  const result = await userService.listUsers({
    page: Number(query.page),
    limit: Number(query.limit),
    role: query.role,
    isActive: query.isActive
  });

  return sendSuccess(res, StatusCodes.OK, "Users fetched successfully", result);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(String(req.params.id));
  return sendSuccess(res, StatusCodes.OK, "User fetched successfully", user);
});

export const changeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.changeUserRole(String(req.params.id), req.body.role);
  return sendSuccess(res, StatusCodes.OK, "User role updated successfully", user);
});

export const changeUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.changeUserStatus(String(req.params.id), req.body.isActive);
  return sendSuccess(res, StatusCodes.OK, "User status updated successfully", user);
});
