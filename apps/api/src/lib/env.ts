import { z } from "zod";

// See .env.example for descriptions and development values.
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    WEB_APP_URL: z.string().url().default("http://localhost:5173"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    JWT_ACCESS_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    SESSION_IDLE_TIMEOUT_HOURS: z.coerce.number().positive().default(24),
    SESSION_MAX_DAYS: z.coerce.number().positive().default(30),

    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default("Brillanda <no-reply@brillanda.local>"),
  })
  .refine((e) => e.NODE_ENV !== "production" || !e.JWT_ACCESS_SECRET.startsWith("change-me"), {
    message: "JWT_ACCESS_SECRET must be replaced with a long random value in production",
    path: ["JWT_ACCESS_SECRET"],
  });

export const env = EnvSchema.parse(process.env);
