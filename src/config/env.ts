import dotenv from "dotenv";
import { z } from "zod";

// Only load .env file in local development
// In Vercel, environment variables are injected via dashboard
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  APP_NAME: z.string().min(1).default("Ceylon Arena API"),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET is too short"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET is too short"),
  JWT_ACCESS_EXPIRES: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES: z.string().min(1).default("7d"),
  COOKIE_DOMAIN: z.string().optional().refine(
    (val) => !val || (!val.startsWith("http") && !val.endsWith("/")),
    { message: "COOKIE_DOMAIN must be a hostname only (no protocol or trailing slash)" }
  ),
  COOKIE_SECURE: z.string().default("false"),
  CLIENT_URL: z.string().default("http://localhost:5173").refine(
    (val) => !val.endsWith("/"),
    { message: "CLIENT_URL must not have trailing slash" }
  ),
  CORS_ORIGINS: z.string().default("http://localhost:5173").refine(
    (val) => !val.split(",").some(origin => origin.trim().endsWith("/")),
    { message: "CORS_ORIGINS must not have trailing slashes" }
  ),
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

const toBoolean = (value: string): boolean => value.toLowerCase() === "true";

const splitOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  ...rawEnv,
  COOKIE_SECURE: toBoolean(rawEnv.COOKIE_SECURE),
  CORS_ORIGINS: splitOrigins(rawEnv.CORS_ORIGINS)
};

export type AppEnv = typeof env;
