import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { HttpError } from "../lib/httpError";
import { currentUser } from "./auth";

/** Route-level role gate (Build Guide §10). Use after requireAuth. The UI hiding a button is never the protection (FR-22.3). */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!roles.includes(currentUser(req).role)) {
      throw new HttpError(403, "You don't have permission to do that.");
    }
    next();
  };
}
