import { z } from "zod";
import { USER_ROLES } from "../../constants";
import { objectIdSchema, paginationQuerySchema } from "../../utils/validation";

const emptyBody = z.object({}).default({});

export const listUsersSchema = z.object({
  body: emptyBody,
  params: z.object({}),
  query: paginationQuerySchema.extend({
    role: z.enum([USER_ROLES.ADMIN, USER_ROLES.PLAYER]).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional()
  })
});

export const userIdParamSchema = z.object({
  body: emptyBody,
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const changeRoleSchema = z.object({
  body: z
    .object({
      role: z.enum([USER_ROLES.ADMIN, USER_ROLES.PLAYER])
    })
    .strict(),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const changeUserStatusSchema = z.object({
  body: z
    .object({
      isActive: z.boolean()
    })
    .strict(),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});
