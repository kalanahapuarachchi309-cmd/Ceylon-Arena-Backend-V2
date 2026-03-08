import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";

export const validate = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));

      throw new ApiError(StatusCodes.BAD_REQUEST, "Validation failed", errors);
    }

    const parsedData = parsed.data as {
      body: unknown;
      params: Record<string, string>;
      query: Record<string, unknown>;
    };

    // Only reassign body - params and query are read-only properties
    req.body = parsedData.body;
    
    // For params and query, clear and repopulate instead of reassigning
    Object.keys(req.params).forEach(key => delete req.params[key]);
    Object.assign(req.params, parsedData.params);
    
    for (const key in req.query) {
      delete req.query[key];
    }
    Object.assign(req.query, parsedData.query);

    next();
  };
};
