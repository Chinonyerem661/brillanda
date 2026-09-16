import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../../lib/env";

const MINUTE_MS = 60_000;

type LimiterOptions = { windowMs: number; limit: number; keyByEmail: boolean; enabledInTests?: boolean };

// A whole school often shares one IP address, so limits on guessing a password are keyed by
// IP *and* email: one teacher mistyping their password can't lock out the staff room.
// Counters live in memory, which is fine for a single API instance (DECISIONS.md F-25).
export function createLimiter({ windowMs, limit, keyByEmail, enabledInTests = false }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test" && !enabledInTests,
    keyGenerator: (req: Request) => {
      const ip = ipKeyGenerator(req.ip ?? "unknown");
      if (!keyByEmail) return ip;
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      return `${ip}|${email}`;
    },
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    },
  });
}

export const loginPerAccountLimiter = createLimiter({ windowMs: 15 * MINUTE_MS, limit: 10, keyByEmail: true });
export const loginPerIpLimiter = createLimiter({ windowMs: 15 * MINUTE_MS, limit: 300, keyByEmail: false });
export const accessCodeLimiter = createLimiter({ windowMs: 15 * MINUTE_MS, limit: 50, keyByEmail: false });
export const forgotPasswordLimiter = createLimiter({ windowMs: 60 * MINUTE_MS, limit: 5, keyByEmail: true });
