import { z } from "zod";

const emptyObject = z.object({}).default({});

const teamMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    inGameId: z.string().trim().min(2).max(60)
  })
  .strict();

export const registerSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100),
      email: z.string().email().trim().toLowerCase(), 
      password: z.string().min(8).max(128),
      phone: z.string().trim().min(6).max(30),
      address: z.string().trim().min(3).max(200),
      promoCode: z.string().trim().max(50).optional(),
      teamName: z.string().trim().min(2).max(100),
      primaryGame: z.string().trim().min(2).max(80).optional(),
      leaderInGameId: z.string().trim().min(2).max(60),
      members: z.array(teamMemberSchema).length(3)
    })
    .strict(),
  params: emptyObject,
  query: emptyObject
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().trim().toLowerCase(),
      password: z.string().min(8).max(128)
    })
    .strict(),
  params: emptyObject,
  query: emptyObject
});

export const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(1).optional()
    })
    .strict(),
  params: emptyObject,
  query: emptyObject
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(8).max(128),
      newPassword: z.string().min(8).max(128)
    })
    .strict(),
  params: emptyObject,
  query: emptyObject
});
