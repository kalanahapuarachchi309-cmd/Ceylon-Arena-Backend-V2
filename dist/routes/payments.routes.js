"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/payments.ts
const express_1 = __importDefault(require("express"));
const payments_controller_1 = require("../controllers/payments.controller");
const router = express_1.default.Router();
// GET /api/payments?page=1&limit=10
router.get("/", payments_controller_1.getPayments);
router.patch("/:id/status", payments_controller_1.changePaymentStatus);
router.delete("/:id", payments_controller_1.deletePayment);
exports.default = router;
