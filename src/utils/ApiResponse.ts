import type { Response } from "express";

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
