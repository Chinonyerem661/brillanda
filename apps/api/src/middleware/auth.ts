import type { Role, SchoolStatus, UserStatus } from "@prisma/client";
import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../lib/tokens";

export type AuthUser = { id: string; role: Role; schoolId: string | null };

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Read it through currentUser() / currentSchoolId(). */
      user?: AuthUser;
    }
  }
}

const notLoggedIn = () => new HttpError(401, "Please log in to continue.");

/**
 * Shared by login, token refresh and every authenticated request, so deactivating a user or
 * suspending a school (FR-6.5, FR-7.3) cuts them off everywhere at once.
 */
export function assertAccountUsable(user: {
  role: Role;
  status: UserStatus;
  school: { status: SchoolStatus } | null;
}): void {
  if (user.status === "DEACTIVATED") {
    throw new HttpError(403, "This account has been deactivated. Please contact your school.");
  }
  if (user.status !== "ACTIVE") throw notLoggedIn();
  if (user.role !== "SUPER_ADMIN" && user.school?.status !== "ACTIVE") {
    throw new HttpError(403, "Your school's account is suspended. Please contact Brillanda support.");
  }
}

/** Verifies the access token, then loads the user fresh: role, status and school are never trusted from the token. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const userId = token ? verifyAccessToken(token) : null;
  if (!userId) throw notLoggedIn();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, schoolId: true, school: { select: { status: true } } },
  });
  if (!user) throw notLoggedIn();
  assertAccountUsable(user);

  req.user = { id: user.id, role: user.role, schoolId: user.schoolId };
  next();
};

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw notLoggedIn();
  return req.user;
}

/** The caller's school: always from the session, never from the request (Build Guide §3). */
export function currentSchoolId(req: Request): string {
  const { schoolId } = currentUser(req);
  if (!schoolId) throw new HttpError(403, "You don't have permission to do that.");
  return schoolId;
}
