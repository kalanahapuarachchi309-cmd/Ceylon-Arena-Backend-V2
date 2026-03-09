import { Router } from "express";
import { USER_ROLES } from "../../constants";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  getMyTeam,
  getTeamById,
  listTeams,
  updateMyTeam
} from "./team.controller";
import {
  listTeamsSchema,
  teamIdParamSchema,
  updateMyTeamSchema
} from "./team.validation";

export const teamRoutes = Router();

teamRoutes.get(
  "/my-team",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  getMyTeam
);
teamRoutes.patch(
  "/my-team",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(updateMyTeamSchema),
  updateMyTeam
);

teamRoutes.get(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(listTeamsSchema),
  listTeams
);
teamRoutes.get(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(teamIdParamSchema),
  getTeamById
);
