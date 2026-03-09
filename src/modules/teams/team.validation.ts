import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "../../utils/validation";

const teamMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    inGameId: z.string().trim().min(2).max(60)
  })
  .strict();

export const updateMyTeamSchema = z.object({
  body: z
    .object({
      teamName: z.string().trim().min(2).max(100).optional(),
      primaryGame: z.string().trim().min(2).max(80).optional(),
      leaderInGameId: z.string().trim().min(2).max(60).optional(),
      members: z.array(teamMemberSchema).length(3).optional(),
      isActive: z.boolean().optional()
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required"
    }),
  params: z.object({}),
  query: z.object({})
});

export const listTeamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema.extend({
    search: z.string().trim().min(1).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional()
  })
});

export const teamIdParamSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});
