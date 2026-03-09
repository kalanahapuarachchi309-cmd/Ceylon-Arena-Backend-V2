"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const seedAdmin_1 = require("./scripts/seedAdmin");
const logger_1 = require("./utils/logger");
const startServer = async () => {
    try {
        await (0, db_1.connectDatabase)();
        if (env_1.env.NODE_ENV !== "production") {
            await (0, seedAdmin_1.seedAdmin)();
        }
        app_1.default.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`${env_1.env.APP_NAME} listening on port ${env_1.env.PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to start server", error);
        process.exit(1);
    }
};
void startServer();
