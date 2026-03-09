import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

// Cache the MongoDB connection for serverless environments
// This prevents creating new connections on every function invocation
let cachedConnection: typeof mongoose | null = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  // If we have a cached connection and it's ready, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    logger.info("Using cached MongoDB connection");
    return cachedConnection;
  }

  // Otherwise, create a new connection
  try {
    // Set mongoose options for better serverless compatibility
    mongoose.set('strictQuery', false);
    
    // Configure connection options for serverless
    const connection = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    logger.info("MongoDB connected successfully");
    return connection;
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
