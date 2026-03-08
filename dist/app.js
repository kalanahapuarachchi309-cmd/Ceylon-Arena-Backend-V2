"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_2 = require("./config/cors");
const env_1 = require("./config/env");
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const auth_routes_1 = require("./modules/auth/auth.routes");
const event_routes_1 = require("./modules/events/event.routes");
const payment_routes_1 = require("./modules/payments/payment.routes");
const registration_routes_1 = require("./modules/registrations/registration.routes");
const team_routes_1 = require("./modules/teams/team.routes");
const user_routes_1 = require("./modules/users/user.routes");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)(cors_2.corsOptions));
exports.app.use((0, morgan_1.default)(env_1.env.NODE_ENV === "production" ? "combined" : "dev"));
exports.app.use(express_1.default.json({ limit: "1mb" }));
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((0, cookie_parser_1.default)());
exports.app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: `${env_1.env.APP_NAME} is running`
    });
});
exports.app.use(`${env_1.env.API_PREFIX}/auth`, auth_routes_1.authRoutes);
exports.app.use(`${env_1.env.API_PREFIX}/users`, user_routes_1.userRoutes);
exports.app.use(`${env_1.env.API_PREFIX}/teams`, team_routes_1.teamRoutes);
exports.app.use(`${env_1.env.API_PREFIX}/events`, event_routes_1.eventRoutes);
exports.app.use(`${env_1.env.API_PREFIX}/registrations`, registration_routes_1.registrationRoutes);
exports.app.use(`${env_1.env.API_PREFIX}/payments`, payment_routes_1.paymentRoutes);
exports.app.use(notFound_middleware_1.notFoundMiddleware);
exports.app.use(error_middleware_1.errorMiddleware);
