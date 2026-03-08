import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import { ApiError } from "../utils/ApiError";

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): Response<ErrorResponse> => {
  if (err instanceof multer.MulterError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  if (err instanceof Error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error"
  });
};
