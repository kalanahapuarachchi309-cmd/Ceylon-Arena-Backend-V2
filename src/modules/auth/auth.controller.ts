import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service";
import { sendSuccess } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions
} from "../../utils/token";
import { ApiError } from "../../utils/ApiError";

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", {
    ...accessTokenCookieOptions,
    maxAge: undefined
  });
  res.clearCookie("refreshToken", {
    ...refreshTokenCookieOptions,
    maxAge: undefined
  });
};

const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  return (req.cookies?.refreshToken as string | undefined) || (req.body.refreshToken as string | undefined);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerLeaderWithTeam(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);

  return sendSuccess(
    res,
    StatusCodes.CREATED,
    "Team leader registered successfully",
    {
      user: result.user,
      team: result.team,
      accessToken: result.accessToken
    }
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);

  return sendSuccess(res, StatusCodes.OK, "Login successful", {
    user: result.user,
    accessToken: result.accessToken
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token is required");
  }

  const tokens = await authService.refreshToken(refreshToken);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  return sendSuccess(res, StatusCodes.OK, "Token refreshed successfully", {
    accessToken: tokens.accessToken
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  await authService.logout(refreshToken);
  clearAuthCookies(res);

  return sendSuccess(res, StatusCodes.OK, "Logged out successfully");
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  await authService.logoutAll(req.user.userId);
  clearAuthCookies(res);

  return sendSuccess(res, StatusCodes.OK, "Logged out from all sessions");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const profile = await authService.getMe(req.user.userId);
  return sendSuccess(res, StatusCodes.OK, "Authenticated user profile", profile);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  await authService.changePassword(req.user.userId, req.body);
  clearAuthCookies(res);

  return sendSuccess(
    res,
    StatusCodes.OK,
    "Password changed successfully. Please log in again."
  );
});
