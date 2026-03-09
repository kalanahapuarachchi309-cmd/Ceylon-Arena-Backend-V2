import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): Response<ErrorResponse> => {
  // Log all errors for Vercel debugging
  logger.error(`[${req.method}] ${req.path}:`, err);
  
  if (err instanceof multer.MulterError) {
    logger.error("Multer error:", { code: err.code, field: err.field });
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message
    });
  }

  if (err instanceof ApiError) {
    // Only log non-auth errors as errors (auth are expected)
    if (err.statusCode >= 500) {
      logger.error("API Error:", { statusCode: err.statusCode, message: err.message, errors: err.errors });
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  if (err instanceof Error) {
    logger.error("Unexpected error:", { message: err.message, stack: err.stack });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
      stack: env.NODE_ENV === "production" ? undefined : err.stack
    });
  }

  logger.error("Unknown error type:", err);
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error"
  });
};
