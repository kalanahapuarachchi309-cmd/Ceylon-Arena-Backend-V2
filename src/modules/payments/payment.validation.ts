import { z } from "zod";
import { PAYMENT_STATUS } from "../../constants";
import { objectIdSchema, paginationQuerySchema } from "../../utils/validation";

export const submitPaymentSchema = z.object({
  body: z
    .object({
      transactionReference: z.string().trim().max(100).optional(),
      bankName: z.string().trim().max(120).optional(),
      accountHolder: z.string().trim().max(120).optional()
    })
    .strict(),
  params: z.object({
    registrationId: objectIdSchema
  }),
  query: z.object({})
});

export const myPaymentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema
});

export const paymentIdParamSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});

export const listPaymentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),
  query: paginationQuerySchema.extend({
    status: z.enum([PAYMENT_STATUS.PENDING, PAYMENT_STATUS.APPROVED, PAYMENT_STATUS.REJECTED]).optional(),
    eventId: objectIdSchema.optional()
  })
});

export const reviewPaymentSchema = z.object({
  body: z
    .object({
      status: z.enum([PAYMENT_STATUS.APPROVED, PAYMENT_STATUS.REJECTED]),
      adminNote: z.string().trim().max(1000).optional()
    })
    .strict(),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({})
});
