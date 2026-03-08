import { z } from "zod";
import { REGISTRATION_STATUS } from "../../constants";
import { objectIdSchema, paginationQuerySchema } from "../../utils/validation";

export const createRegistrationSchema = z.object({
  body: z
    .object({
      eventId: objectIdSchema
    })
    .strict(),
  params: z.object({}),
  query: z.object({})
});

export const myRegistrationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema
});

export const registrationIdParamSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const listRegistrationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema.extend({
    eventId: objectIdSchema.optional(),
    status: z
      .enum([
        REGISTRATION_STATUS.PENDING_PAYMENT,
        REGISTRATION_STATUS.PAYMENT_SUBMITTED,
        REGISTRATION_STATUS.CONFIRMED,
        REGISTRATION_STATUS.REJECTED,
        REGISTRATION_STATUS.CANCELLED
      ])
      .optional()
  })
});

export const updateRegistrationStatusSchema = z.object({
  body: z
    .object({
      status: z.enum([
        REGISTRATION_STATUS.PENDING_PAYMENT,
        REGISTRATION_STATUS.PAYMENT_SUBMITTED,
        REGISTRATION_STATUS.CONFIRMED,
        REGISTRATION_STATUS.REJECTED,
        REGISTRATION_STATUS.CANCELLED
      ]),
      notes: z.string().trim().max(1000).optional()
    })
    .strict(),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});
