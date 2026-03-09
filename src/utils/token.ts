import crypto from "crypto";
import type { CookieOptions } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthTokenPayload } from "../types/auth.types";

export const signAccessToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    subject: payload.userId,
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    ...options
  });
};

export const signRefreshToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    subject: payload.userId,
    expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    ...options
  });
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const expiresToMilliseconds = (value: string): number | undefined => {
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
};

const sameSite: CookieOptions["sameSite"] = env.COOKIE_SECURE ? "none" : "lax";
const cookieDomain =
  env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== "localhost" ? env.COOKIE_DOMAIN : undefined;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite,
  domain: cookieDomain,
  path: "/"
};

export const accessTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: expiresToMilliseconds(env.JWT_ACCESS_EXPIRES)
};

export const refreshTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: expiresToMilliseconds(env.JWT_REFRESH_EXPIRES)
};
