import { createHash, randomBytes, randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env";

/** Short-lived access token. Carries only the user id: role, status and school are loaded fresh on each request. */
export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    algorithm: "HS256",
  });
}

/** The user id, or null if the token is malformed, expired or signed with another key. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Unguessable, URL-safe secret for emailed links and refresh tokens. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Secrets are stored only as this hash, so a database leak doesn't hand out working links or sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// No 0/O or 1/I, so a code read off paper can't be mistyped between look-alikes.
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Printed parent access code, e.g. "K7QM-2XPA-9RTD" (DECISIONS.md D-5). */
export function generateAccessCode(): string {
  const chars = Array.from({ length: 12 }, () => ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)]);
  return [0, 4, 8].map((start) => chars.slice(start, start + 4).join("")).join("-");
}

/** Accepts codes typed in any case, with or without dashes and spaces. Hash this form. */
export function normalizeAccessCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
