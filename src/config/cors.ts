import type { CorsOptions } from "cors";
import { env } from "./env";
import { logger } from "../utils/logger";

const allowedOrigins = new Set(env.CORS_ORIGINS);

export const isOriginAllowed = (origin: string): boolean => allowedOrigins.has(origin);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    // Log rejected origins for debugging
    logger.warn(`CORS rejected origin: ${origin}. Allowed origins:`, Array.from(allowedOrigins));
    
    // Reject without throwing to avoid crashing serverless handlers.
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400
};
