import express from "express"
import cors from "cors"
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/user.routes";
import paymentRoutes from "./routes/payments.routes";
import dotenv from "dotenv"
import mongoose from "mongoose"
dotenv.config()

const SERVER_PORT = process.env.SERVER_PORT
const MONGO_URI = process.env.MONGO_URI as string

const app = express()

app.use(express.json())
app.use(
  cors({
    origin: ["http://localhost:5173", "https://www.ceylonarena.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/payments", paymentRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("DB connected")
  })
  .catch((err) => {
    console.error(`DB connection fail: ${err}`)
    process.exit(1)
  })

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}`)
})
