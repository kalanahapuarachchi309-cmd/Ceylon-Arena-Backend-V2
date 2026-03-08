import { Router } from "express";
import { USER_ROLES } from "../../constants";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getPublicEventBySlug,
  listEvents,
  listPublicEvents,
  updateEvent
} from "./event.controller";
import {
  createEventSchema,
  eventIdParamSchema,
  listEventsSchema,
  publicEventSlugSchema,
  updateEventSchema
} from "./event.validation";

export const eventRoutes = Router();

eventRoutes.get("/public", validate(listEventsSchema), listPublicEvents);
eventRoutes.get(
  "/public/:slug",
  validate(publicEventSlugSchema),
  getPublicEventBySlug
);

eventRoutes.get(
  "/",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(listEventsSchema),
  listEvents
);

eventRoutes.get(
  "/:id",
  authenticate,
  authorize(USER_ROLES.PLAYER, USER_ROLES.ADMIN),
  validate(eventIdParamSchema),
  getEventById
);

eventRoutes.post(
  "/",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(createEventSchema),
  createEvent
);

eventRoutes.patch(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(updateEventSchema),
  updateEvent
);

eventRoutes.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(eventIdParamSchema),
  deleteEvent
);
