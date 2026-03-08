import { z } from "zod";
import { EVENT_STATUS } from "../../constants";
import { objectIdSchema, paginationQuerySchema } from "../../utils/validation";

const createEventBodySchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    gameName: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(5000),
    bannerImage: z.string().url().optional(),
    rules: z.string().trim().max(8000).optional(),
    entryFee: z.coerce.number().min(0),
    currency: z.string().trim().min(3).max(10).default("LKR"),
    maxTeams: z.coerce.number().int().min(1).optional(),
    registrationOpenAt: z.coerce.date(),
    registrationCloseAt: z.coerce.date(),
    eventStartAt: z.coerce.date(),
    eventEndAt: z.coerce.date(),
    status: z
      .enum([
        EVENT_STATUS.DRAFT,
        EVENT_STATUS.PUBLISHED,
        EVENT_STATUS.ACTIVE,
        EVENT_STATUS.CLOSED,
        EVENT_STATUS.CANCELLED
      ])
      .default(EVENT_STATUS.DRAFT)
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.registrationOpenAt >= body.registrationCloseAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "registrationOpenAt must be before registrationCloseAt",
        path: ["registrationOpenAt"]
      });
    }

    if (body.eventStartAt >= body.eventEndAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "eventStartAt must be before eventEndAt",
        path: ["eventStartAt"]
      });
    }

    if (body.registrationCloseAt > body.eventStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "registrationCloseAt must be on or before eventStartAt",
        path: ["registrationCloseAt"]
      });
    }
  });

export const createEventSchema = z.object({
  body: createEventBodySchema,
  params: z.object({}),
  query: z.object({})
});

const updateEventBodySchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    gameName: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    bannerImage: z.string().url().optional(),
    rules: z.string().trim().max(8000).optional(),
    entryFee: z.coerce.number().min(0).optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    maxTeams: z.coerce.number().int().min(1).optional(),
    registrationOpenAt: z.coerce.date().optional(),
    registrationCloseAt: z.coerce.date().optional(),
    eventStartAt: z.coerce.date().optional(),
    eventEndAt: z.coerce.date().optional(),
    status: z
      .enum([
        EVENT_STATUS.DRAFT,
        EVENT_STATUS.PUBLISHED,
        EVENT_STATUS.ACTIVE,
        EVENT_STATUS.CLOSED,
        EVENT_STATUS.CANCELLED
      ])
      .optional()
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required"
  });

export const updateEventSchema = z.object({
  body: updateEventBodySchema,
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const listEventsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema.extend({
    status: z
      .enum([
        EVENT_STATUS.DRAFT,
        EVENT_STATUS.PUBLISHED,
        EVENT_STATUS.ACTIVE,
        EVENT_STATUS.CLOSED,
        EVENT_STATUS.CANCELLED
      ])
      .optional(),
    gameName: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional()
  })
});

export const eventIdParamSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const publicEventSlugSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    slug: z.string().trim().min(1)
  }),
  query: z.object({})
});
