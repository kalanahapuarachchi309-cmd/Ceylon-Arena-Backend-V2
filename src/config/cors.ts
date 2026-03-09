import type { CorsOptions } from "cors";
import { env } from "./env";
import { logger } from "../utils/logger";

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list
    if (env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    // Log rejected origins for debugging
    logger.warn(`CORS rejected origin: ${origin}. Allowed origins:`, env.CORS_ORIGINS);
    
    // CRITICAL: Do NOT throw Error - use callback(null, false) to reject
    // Throwing Error crashes serverless functions
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
