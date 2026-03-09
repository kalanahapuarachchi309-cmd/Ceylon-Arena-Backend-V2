import mongoose, { type Mongoose } from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

interface MongooseConnectionCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
  listenersAttached: boolean;
}

const globalWithMongooseCache = globalThis as typeof globalThis & {
  __mongooseConnectionCache?: MongooseConnectionCache;
};

const mongooseConnectionCache =
  globalWithMongooseCache.__mongooseConnectionCache ??
  (globalWithMongooseCache.__mongooseConnectionCache = {
    conn: null,
    promise: null,
    listenersAttached: false
  });

const attachConnectionListeners = (): void => {
  if (mongooseConnectionCache.listenersAttached) {
    return;
  }

  mongoose.connection.on("error", (error: Error) => {
    logger.error("MongoDB runtime error", {
      name: error.name,
      message: error.message
    });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongooseConnectionCache.listenersAttached = true;
};

export const connectDatabase = async (): Promise<Mongoose> => {
  if (mongoose.connection.readyState === 1) {
    mongooseConnectionCache.conn = mongoose;
    return mongoose;
  }

  if (mongooseConnectionCache.promise) {
    return mongooseConnectionCache.promise;
  }

  try {
    attachConnectionListeners();
    mongoose.set("strictQuery", false);
    mongoose.set("bufferCommands", false);

    mongooseConnectionCache.promise = mongoose
      .connect(env.MONGO_URI, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
      })
      .then((connection) => {
        mongooseConnectionCache.conn = connection;
        mongooseConnectionCache.promise = null;
        logger.info("MongoDB connected successfully");
        return connection;
      })
      .catch((error: unknown) => {
        mongooseConnectionCache.promise = null;

        if (error instanceof Error) {
          logger.error("MongoDB connection error", {
            name: error.name,
            message: error.message
          });
        } else {
          logger.error("MongoDB connection error", error);
        }

        throw new Error("Failed to connect to MongoDB. Check MONGO_URI and network access.");
      });

    return mongooseConnectionCache.promise;
  } catch (error) {
    mongooseConnectionCache.promise = null;
    throw error;
  }
};
