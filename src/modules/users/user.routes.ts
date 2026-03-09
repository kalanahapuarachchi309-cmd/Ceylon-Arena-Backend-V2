import { Router } from "express";
import { USER_ROLES } from "../../constants";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  changeUserRole,
  changeUserStatus,
  getUserById,
  listUsers
} from "./user.controller";
import {
  changeRoleSchema,
  changeUserStatusSchema,
  listUsersSchema,
  userIdParamSchema
} from "./user.validation";

export const userRoutes = Router();

userRoutes.use(authenticate, authorize(USER_ROLES.ADMIN));

userRoutes.get("/", validate(listUsersSchema), listUsers);
userRoutes.get("/:id", validate(userIdParamSchema), getUserById);
userRoutes.patch("/:id/role", validate(changeRoleSchema), changeUserRole);
userRoutes.patch("/:id/status", validate(changeUserStatusSchema), changeUserStatus);
