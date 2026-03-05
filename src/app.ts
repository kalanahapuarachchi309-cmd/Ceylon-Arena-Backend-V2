import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payments.routes";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://www.ceylonarena.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  })
);

app.use(express.json());

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/payments", paymentRoutes);

export default app;
