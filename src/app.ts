import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/notFound.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { eventRoutes } from "./modules/events/event.routes";
import { paymentRoutes } from "./modules/payments/payment.routes";
import { registrationRoutes } from "./modules/registrations/registration.routes";
import { teamRoutes } from "./modules/teams/team.routes";
import { userRoutes } from "./modules/users/user.routes";

export const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.APP_NAME} is running`
  });
});

app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/users`, userRoutes);
app.use(`${env.API_PREFIX}/teams`, teamRoutes);
app.use(`${env.API_PREFIX}/events`, eventRoutes);
app.use(`${env.API_PREFIX}/registrations`, registrationRoutes);
app.use(`${env.API_PREFIX}/payments`, paymentRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
