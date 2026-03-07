"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
const isAdmin = (req, res, next) => {
    console.error("Checking admin role for user:", req.user);
    if (req.user?.role === "ADMIN") {
        next();
    }
    else {
        res.status(403).json({ message: "Forbidden: Admins only" });
    }
};
exports.isAdmin = isAdmin;
