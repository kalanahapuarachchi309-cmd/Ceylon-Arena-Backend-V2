import { Router } from "express";
import { USER_ROLES } from "../../constants";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { slipUpload } from "../../middleware/upload.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  deletePayment,
  getPaymentById,
  listMyPayments,
  listPayments,
  reviewPayment,
  submitPayment
} from "./payment.controller";
import {
  listPaymentsSchema,
  myPaymentsSchema,
  paymentIdParamSchema,
  reviewPaymentSchema,
  submitPaymentSchema
} from "./payment.validation";

export const paymentRoutes = Router();

paymentRoutes.post(
  "/submit/:registrationId",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  slipUpload.single("slip"),
  validate(submitPaymentSchema),
  submitPayment
);

paymentRoutes.get(
  "/my",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(myPaymentsSchema),
  listMyPayments
);

paymentRoutes.get(
  "/:id",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(paymentIdParamSchema),
  getPaymentById
);

paymentRoutes.get(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(listPaymentsSchema),
  listPayments
);

paymentRoutes.patch(
  "/:id/review",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(reviewPaymentSchema),
  reviewPayment
);

paymentRoutes.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(paymentIdParamSchema),
  deletePayment
);
