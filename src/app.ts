import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsOptions } from "./config/cors";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/notFound.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { eventRoutes } from "./modules/events/event.routes";
import { paymentRoutes } from "./modules/payments/payment.routes";
import { registrationRoutes } from "./modules/registrations/registration.routes";
import { teamRoutes } from "./modules/teams/team.routes";
import { userRoutes } from "./modules/users/user.routes";
import { logger } from "./utils/logger";

const app = express();

// Middleware setup
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.APP_NAME} is running`
  });
});

// API routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/users`, userRoutes);
app.use(`${env.API_PREFIX}/teams`, teamRoutes);
app.use(`${env.API_PREFIX}/events`, eventRoutes);
app.use(`${env.API_PREFIX}/registrations`, registrationRoutes);
app.use(`${env.API_PREFIX}/payments`, paymentRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Initialize database connection for serverless
// This ensures the connection is established before handling requests
// The connection will be cached and reused across invocations
let isDbConnected = false;

const initializeApp = async () => {
  if (!isDbConnected) {
    try {
      await connectDatabase();
      isDbConnected = true;
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      // Don't throw here, let individual requests handle connection errors
    }
  }
};

// Initialize on module load for serverless environments
void initializeApp();

// Export both named (for server.ts) and default (for Vercel) exports
export { app };
export default app;
