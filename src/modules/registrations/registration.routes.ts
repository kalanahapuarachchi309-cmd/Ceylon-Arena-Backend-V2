import { Router } from "express";
import { USER_ROLES } from "../../constants";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createRegistration,
  getRegistrationById,
  listMyRegistrations,
  listRegistrations,
  updateRegistrationStatus
} from "./registration.controller";
import {
  createRegistrationSchema,
  listRegistrationsSchema,
  myRegistrationsSchema,
  registrationIdParamSchema,
  updateRegistrationStatusSchema
} from "./registration.validation";

export const registrationRoutes = Router();

registrationRoutes.post(
  "/",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(createRegistrationSchema),
  createRegistration
);

registrationRoutes.get(
  "/my",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(myRegistrationsSchema),
  listMyRegistrations
);

registrationRoutes.get(
  "/:id",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(registrationIdParamSchema),
  getRegistrationById
);

registrationRoutes.get(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(listRegistrationsSchema),
  listRegistrations
);

registrationRoutes.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(updateRegistrationStatusSchema),
  updateRegistrationStatus
);
