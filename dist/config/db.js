"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
const globalWithMongooseCache = globalThis;
const mongooseConnectionCache = globalWithMongooseCache.__mongooseConnectionCache ??
    (globalWithMongooseCache.__mongooseConnectionCache = {
        conn: null,
        promise: null,
        listenersAttached: false
    });
const attachConnectionListeners = () => {
    if (mongooseConnectionCache.listenersAttached) {
        return;
    }
    mongoose_1.default.connection.on("error", (error) => {
        logger_1.logger.error("MongoDB runtime error", {
            name: error.name,
            message: error.message
        });
    });
    mongoose_1.default.connection.on("disconnected", () => {
        logger_1.logger.warn("MongoDB disconnected");
    });
    mongooseConnectionCache.listenersAttached = true;
};
const connectDatabase = async () => {
    if (mongoose_1.default.connection.readyState === 1) {
        mongooseConnectionCache.conn = mongoose_1.default;
        return mongoose_1.default;
    }
    if (mongooseConnectionCache.promise) {
        return mongooseConnectionCache.promise;
    }
    try {
        attachConnectionListeners();
        mongoose_1.default.set("strictQuery", false);
        mongoose_1.default.set("bufferCommands", false);
        mongooseConnectionCache.promise = mongoose_1.default
            .connect(env_1.env.MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        })
            .then((connection) => {
            mongooseConnectionCache.conn = connection;
            mongooseConnectionCache.promise = null;
            logger_1.logger.info("MongoDB connected successfully");
            return connection;
        })
            .catch((error) => {
            mongooseConnectionCache.promise = null;
            if (error instanceof Error) {
                logger_1.logger.error("MongoDB connection error", {
                    name: error.name,
                    message: error.message
                });
            }
            else {
                logger_1.logger.error("MongoDB connection error", error);
            }
            throw new Error("Failed to connect to MongoDB. Check MONGO_URI and network access.");
        });
        return mongooseConnectionCache.promise;
    }
    catch (error) {
        mongooseConnectionCache.promise = null;
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
