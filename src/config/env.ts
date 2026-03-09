import dotenv from "dotenv";
import { z } from "zod";

// On Vercel, env vars are injected via dashboard.
// Local development still reads from .env.
if (!process.env.VERCEL) {
  dotenv.config();
}

const hasMongoDatabaseName = (uri: string): boolean => {
  const normalizedUri = uri.trim();
  const match = normalizedUri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)(?:\?|$)/i);

  return Boolean(match?.[1]?.trim());
};

const normalizeApiPrefix = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("API_PREFIX must not be empty");
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.replace(/\/+$/, "");
};

const normalizeOrigin = (value: string, key: string): string => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value.trim());
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`${key} must use http or https`);
  }

  if (parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    throw new Error(`${key} must be origin-only (no path/query/hash)`);
  }

  return parsedUrl.origin;
};

const normalizeCookieDomain = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.includes("://") || trimmed.includes("/") || /\s/.test(trimmed)) {
    throw new Error("COOKIE_DOMAIN must be hostname only (no protocol/path/spaces)");
  }

  return trimmed.toLowerCase();
};

const parseBoolean = (value: string, key: string): boolean => {
  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw new Error(`${key} must be a boolean value (true/false)`);
};

const splitAndNormalizeOrigins = (value: string): string[] => {
  const normalizedOrigins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, "CORS_ORIGINS"));

  if (!normalizedOrigins.length) {
    throw new Error("CORS_ORIGINS must include at least one valid origin");
  }

  return Array.from(new Set(normalizedOrigins));
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  APP_NAME: z.string().min(1).default("Ceylon Arena API"),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required").refine(hasMongoDatabaseName, {
    message: "MONGO_URI must include an explicit database name"
  }),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET is too short"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET is too short"),
  JWT_ACCESS_EXPIRES: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES: z.string().min(1).default("7d"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().default("false"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

const rawEnv = parsedEnv.data;

const normalizedApiPrefix = normalizeApiPrefix(rawEnv.API_PREFIX);
const normalizedClientUrl = normalizeOrigin(rawEnv.CLIENT_URL, "CLIENT_URL");
const normalizedCorsOrigins = splitAndNormalizeOrigins(rawEnv.CORS_ORIGINS);
const normalizedCookieDomain = normalizeCookieDomain(rawEnv.COOKIE_DOMAIN);
const normalizedCookieSecure = parseBoolean(rawEnv.COOKIE_SECURE, "COOKIE_SECURE");

if (!normalizedCorsOrigins.includes(normalizedClientUrl)) {
  normalizedCorsOrigins.push(normalizedClientUrl);
}

export const env = {
  ...rawEnv,
  API_PREFIX: normalizedApiPrefix,
  MONGO_URI: rawEnv.MONGO_URI.trim(),
  CLIENT_URL: normalizedClientUrl,
  CORS_ORIGINS: normalizedCorsOrigins,
  COOKIE_DOMAIN: normalizedCookieDomain,
  COOKIE_SECURE: normalizedCookieSecure
};

export type AppEnv = typeof env;
