import type { AuthTokenType, Prisma, Role } from "@prisma/client";
import { sendEmail } from "../../lib/email";
import { env } from "../../lib/env";
import { HttpError } from "../../lib/httpError";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "../../lib/passwords";
import { prisma } from "../../lib/prisma";
import { readSchoolSettings } from "../../lib/schoolSettings";
import { hashToken, normalizeAccessCode, randomToken, signAccessToken } from "../../lib/tokens";
import { assertAccountUsable } from "../../middleware/auth";

const HOUR_MS = 3_600_000;
export const INVITE_TTL_MS = 72 * HOUR_MS; // FR-7.1
const RESET_TTL_MS = HOUR_MS;
/** How long a just-rotated refresh token keeps working, for tabs that refreshed at the same moment. */
export const REFRESH_GRACE_MS = 60_000;

const userInclude = {
  school: { select: { id: true, name: true, slug: true, logoUrl: true, status: true, settings: true } },
} satisfies Prisma.UserInclude;

type UserWithSchool = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export type PublicUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  school: { id: string; name: string; slug: string; logoUrl: string | null } | null;
};

/** refreshToken is absent when an existing cookie stays valid (the grace path). */
export type Session = {
  accessToken: string;
  user: PublicUser;
  refreshToken?: string;
  refreshExpiresAt?: Date;
};

const invalidLogin = () => new HttpError(401, "Email or password is incorrect.");
const sessionExpired = () => new HttpError(401, "Your session has expired. Please log in again.");
const invalidInvite = () =>
  new HttpError(404, "This invite link is invalid or has expired. Ask your school admin to send a new one.");
const invalidReset = () => new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");

function toPublicUser(user: UserWithSchool): PublicUser {
  const { school } = user;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    school: school && { id: school.id, name: school.name, slug: school.slug, logoUrl: school.logoUrl },
  };
}

async function startSession(user: UserWithSchool): Promise<Session> {
  const refreshToken = randomToken();
  const now = new Date();
  const refreshExpiresAt = new Date(now.getTime() + env.SESSION_MAX_DAYS * 24 * HOUR_MS);
  await prisma.$transaction([
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt, lastUsedAt: now },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
  ]);
  return { accessToken: signAccessToken(user.id), refreshToken, refreshExpiresAt, user: toPublicUser(user) };
}

export async function login(email: string, password: string): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
  if (!user?.passwordHash) {
    await verifyAgainstDummy(password);
    throw invalidLogin();
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidLogin();
  // Checked only after the password, so account status is never revealed to someone guessing.
  assertAccountUsable(user);
  return startSession(user);
}

export async function loginWithAccessCode(code: string): Promise<Session> {
  const record = await prisma.parentAccessCode.findUnique({
    where: { codeHash: hashToken(normalizeAccessCode(code)) },
    include: { parent: { include: userInclude } },
  });
  if (!record || record.revokedAt || record.parent.role !== "PARENT") {
    throw new HttpError(401, "That access code isn't valid. Check it and try again.");
  }
  const { parent } = record;
  assertAccountUsable(parent);
  if (!readSchoolSettings(parent.school?.settings).parentAccessCodes) {
    throw new HttpError(403, "Your school doesn't use access codes. Please log in with your email and password.");
  }
  await prisma.parentAccessCode.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return startSession(parent);
}

export async function refreshSession(refreshToken: string | undefined): Promise<Session> {
  if (!refreshToken) throw sessionExpired();
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { include: userInclude } },
  });
  const now = Date.now();
  if (!record || record.revokedAt || record.expiresAt.getTime() <= now) throw sessionExpired();
  const { user } = record;

  if (record.rotatedAt) {
    if (now - record.rotatedAt.getTime() > REFRESH_GRACE_MS) {
      // An old token turning up again long after it was exchanged suggests it was stolen:
      // end every session for this user.
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date(now) },
      });
      throw sessionExpired();
    }
    assertAccountUsable(user);
    return { accessToken: signAccessToken(user.id), user: toPublicUser(user) };
  }

  if (now - record.lastUsedAt.getTime() > env.SESSION_IDLE_TIMEOUT_HOURS * HOUR_MS) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date(now) } });
    throw sessionExpired();
  }
  assertAccountUsable(user);

  // Conditional update: when two requests race with the same token, only one rotates it.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: record.id, rotatedAt: null, revokedAt: null },
    data: { rotatedAt: new Date(now) },
  });
  if (claimed.count === 0) {
    return { accessToken: signAccessToken(user.id), user: toPublicUser(user) };
  }

  const next = randomToken();
  // The replacement keeps the original expiry, so rotating never extends SESSION_MAX_DAYS.
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(next), expiresAt: record.expiresAt, lastUsedAt: new Date(now) },
  });
  return {
    accessToken: signAccessToken(user.id),
    refreshToken: next,
    refreshExpiresAt: record.expiresAt,
    user: toPublicUser(user),
  };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!record) return;
  const now = new Date();
  await prisma.refreshToken.updateMany({
    where: {
      userId: record.userId,
      revokedAt: null,
      // This token, plus any just-rotated predecessor still inside its grace window.
      OR: [{ id: record.id }, { rotatedAt: { gte: new Date(now.getTime() - REFRESH_GRACE_MS) } }],
    },
    data: { revokedAt: now },
  });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  return toPublicUser(await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude }));
}

type AuthTokenWriter = {
  authToken: {
    updateMany(args: { where: Prisma.AuthTokenWhereInput; data: Prisma.AuthTokenUpdateManyMutationInput }): PromiseLike<unknown>;
    create(args: { data: Prisma.AuthTokenUncheckedCreateInput }): PromiseLike<unknown>;
  };
};

/** Creates a single-use emailed-link token and retires any earlier unused one of the same type. Returns the raw token. */
export async function issueAuthToken(
  db: AuthTokenWriter,
  userId: string,
  type: AuthTokenType,
  ttlMs: number,
): Promise<string> {
  const token = randomToken();
  const now = new Date();
  await db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: now } });
  await db.authToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + ttlMs) },
  });
  return token;
}

async function findUsableToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: userInclude } },
  });
  if (!record || record.type !== type || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
  return record;
}

export async function getInvite(token: string) {
  const record = await findUsableToken(token, "INVITE");
  if (!record || record.user.status !== "INVITED") throw invalidInvite();
  const { user } = record;
  return { fullName: user.fullName, email: user.email, role: user.role, schoolName: user.school?.name ?? null };
}

export async function acceptInvite(token: string, password: string): Promise<Session> {
  const record = await findUsableToken(token, "INVITE");
  if (!record || record.user.status !== "INVITED") throw invalidInvite();
  assertAccountUsable({ ...record.user, status: "ACTIVE" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    // Claimed with a conditional update, so a double-submitted form activates the account once.
    const claimed = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) throw invalidInvite();
    return tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, status: "ACTIVE" },
      include: userInclude,
    });
  });
  return startSession(user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
  if (!user?.passwordHash || user.status !== "ACTIVE") return;
  if (user.role !== "SUPER_ADMIN" && user.school?.status !== "ACTIVE") return;

  const token = await prisma.$transaction((tx) => issueAuthToken(tx, user.id, "PASSWORD_RESET", RESET_TTL_MS));
  // Not awaited: the response must not take longer when the account exists.
  sendEmail({
    to: email,
    subject: "Reset your Brillanda password",
    text: [
      `Hello ${user.fullName},`,
      "",
      "We received a request to reset your Brillanda password. Open this link within 1 hour to choose a new one:",
      "",
      `${env.WEB_APP_URL}/reset-password/${token}`,
      "",
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ].join("\n"),
  }).catch((err) => console.error("Password reset email failed", err));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await findUsableToken(token, "PASSWORD_RESET");
  if (!record || record.user.status !== "ACTIVE") throw invalidReset();

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) throw invalidReset();
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    // Log out everywhere: whoever knew the old password must not keep a session.
    await tx.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
  });
}
