import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/token";
import { UserModel } from "../modules/users/user.model";
import type { AuthTokenPayload } from "../types/auth.types";

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.split(" ")[1] ?? null;
};

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const cookieToken = req.cookies?.accessToken as string | undefined;
    const bearerToken = extractBearerToken(req.headers.authorization);
    const token = cookieToken || bearerToken;

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    let payload: AuthTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired access token");
    }

    const user = await UserModel.findById(payload.userId)
      .select("_id email role isActive")
      .lean();

    if (!user || !user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User is inactive or not found");
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  }
);
