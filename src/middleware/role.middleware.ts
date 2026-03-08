import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { UserRole } from "../constants";
import { ApiError } from "../utils/ApiError";

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Insufficient permissions");
    }

    next();
  };
};
