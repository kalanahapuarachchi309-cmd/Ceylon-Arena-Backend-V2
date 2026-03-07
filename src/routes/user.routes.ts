import express from "express";
import { register, login, refreshToken, logout, registerWithBankPayment, getUserById } from "../controllers/user.controller";
import { upload } from "../middleware/upload";

const router = express.Router();

router.post("/register", register);
router.post(
  "/register-with-bank-payment",
  upload.single("slipFile"),
  registerWithBankPayment
);
router.post("/login", login);

router.get("/me/:id", getUserById);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

export default router;
