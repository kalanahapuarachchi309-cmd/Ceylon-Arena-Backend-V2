"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const http_status_codes_1 = require("http-status-codes");
const morgan_1 = __importDefault(require("morgan"));
const cors_2 = require("./config/cors");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const auth_routes_1 = require("./modules/auth/auth.routes");
const event_routes_1 = require("./modules/events/event.routes");
const payment_routes_1 = require("./modules/payments/payment.routes");
const registration_routes_1 = require("./modules/registrations/registration.routes");
const team_routes_1 = require("./modules/teams/team.routes");
const user_routes_1 = require("./modules/users/user.routes");
const ApiError_1 = require("./utils/ApiError");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const apiPrefix = env_1.env.API_PREFIX;
const withApiPrefix = (path) => {
    if (apiPrefix === "/") {
        return path;
    }
    return `${apiPrefix}${path}`;
};
const healthHandler = (_req, res) => {
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: `${env_1.env.APP_NAME} is running`
    });
};
// Middleware setup
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(cors_2.corsOptions));
app.options(/.*/, (0, cors_1.default)(cors_2.corsOptions));
app.use((0, morgan_1.default)(env_1.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
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
        await (0, db_1.connectDatabase)();
        next();
    }
    catch (error) {
        logger_1.logger.error("Database unavailable for incoming request", {
            method: req.method,
            path: req.originalUrl,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.SERVICE_UNAVAILABLE, "Database is temporarily unavailable. Please try again shortly."));
    }
});
// API routes
app.use(withApiPrefix("/auth"), auth_routes_1.authRoutes);
app.use(withApiPrefix("/users"), user_routes_1.userRoutes);
app.use(withApiPrefix("/teams"), team_routes_1.teamRoutes);
app.use(withApiPrefix("/events"), event_routes_1.eventRoutes);
app.use(withApiPrefix("/registrations"), registration_routes_1.registrationRoutes);
app.use(withApiPrefix("/payments"), payment_routes_1.paymentRoutes);
if (apiPrefix !== "/") {
    app.use(["/auth", "/users", "/teams", "/events", "/registrations", "/payments"], (_req, res) => {
        res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
            success: false,
            message: `Missing API prefix. Use routes under ${apiPrefix}`
        });
    });
}
// Error handling
app.use(notFound_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
