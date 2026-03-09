import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
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
import { ApiError } from "./utils/ApiError";
import { logger } from "./utils/logger";

const app = express();
const apiPrefix = env.API_PREFIX;

const withApiPrefix = (path: string): string => {
  if (apiPrefix === "/") {
    return path;
  }

  return `${apiPrefix}${path}`;
};

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: `${env.APP_NAME} is running`
  });
};

// Middleware setup
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", healthHandler);
const prefixedHealthRoute = withApiPrefix("/health");
if (prefixedHealthRoute !== "/health") {
  app.get(prefixedHealthRoute, healthHandler);
}

// Ensure DB is connected for API requests in serverless/runtime.
app.use(async (req, _res, next) => {
  if (req.method === "OPTIONS" || req.path === "/health" || req.path === prefixedHealthRoute) {
    next();
    return;
  }

  try {
    await connectDatabase();
    next();
  } catch (error) {
    logger.error("Database unavailable for incoming request", {
      method: req.method,
      path: req.originalUrl,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    next(
      new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "Database is temporarily unavailable. Please try again shortly."
      )
    );
  }
});

// API routes
app.use(withApiPrefix("/auth"), authRoutes);
app.use(withApiPrefix("/users"), userRoutes);
app.use(withApiPrefix("/teams"), teamRoutes);
app.use(withApiPrefix("/events"), eventRoutes);
app.use(withApiPrefix("/registrations"), registrationRoutes);
app.use(withApiPrefix("/payments"), paymentRoutes);

if (apiPrefix !== "/") {
  app.use(["/auth", "/users", "/teams", "/events", "/registrations", "/payments"], (_req, res) => {
    res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: `Missing API prefix. Use routes under ${apiPrefix}`
    });
  });
}

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
