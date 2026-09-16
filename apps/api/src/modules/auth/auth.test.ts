import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  PASSWORD,
  api,
  bearer,
  createSchool,
  createUser,
  lastEmailTo,
  linkToken,
  login,
  refreshCookieFrom,
  uniqueId,
} from "../../../tests/helpers";
import { env } from "../../lib/env";
import { prisma } from "../../lib/prisma";
import { generateAccessCode, hashToken, normalizeAccessCode } from "../../lib/tokens";
import { REFRESH_GRACE_MS } from "./service";

const HOUR_MS = 3_600_000;
const NEW_PASSWORD = "a-brand-new-password";

async function teacherAt(school?: { id: string }) {
  const { id } = school ?? (await createSchool());
  return createUser(id, "TEACHER");
}

describe("POST /auth/login", () => {
  const post = (body: object) => api().post("/api/v1/auth/login").send(body);

  it("logs in and sets a locked-down refresh cookie", async () => {
    const school = await createSchool();
    const teacher = await teacherAt(school);

    const res = await post({ email: teacher.email!.toUpperCase(), password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      user: { id: teacher.id, role: "TEACHER", school: { id: school.id, name: school.name } },
    });
    expect(res.body).not.toHaveProperty("refreshToken");
    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("brillanda_refresh="));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it("answers identically for a wrong password and an unknown email", async () => {
    const teacher = await teacherAt();
    const wrongPassword = await post({ email: teacher.email, password: "not-the-password" });
    const unknownEmail = await post({ email: `nobody-${uniqueId()}@test.local`, password: "not-the-password" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("returns field errors for a malformed body", async () => {
    const res = await post({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.fields).toMatchObject({ email: expect.any(Array), password: expect.any(Array) });
  });

  it("does not let an invited user without a password in", async () => {
    const school = await createSchool();
    const invited = await createUser(school.id, "TEACHER", { status: "INVITED", password: null });
    expect((await post({ email: invited.email, password: PASSWORD })).status).toBe(401);
  });

  it("blocks deactivated users", async () => {
    const school = await createSchool();
    const user = await createUser(school.id, "TEACHER", { status: "DEACTIVATED" });
    const res = await post({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/);
  });

  it("blocks users of a suspended school, but not super admins", async () => {
    const school = await createSchool({ status: "SUSPENDED" });
    const admin = await createUser(school.id, "SCHOOL_ADMIN");
    const res = await post({ email: admin.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/suspended/);

    const superAdmin = await createUser(null, "SUPER_ADMIN");
    await expect(login(superAdmin)).resolves.toMatchObject({ accessToken: expect.any(String) });
  });
});

describe("authenticated requests", () => {
  const me = (token?: string) => {
    const req = api().get("/api/v1/auth/me");
    return token ? req.set(bearer(token)) : req;
  };

  it("rejects missing, forged and expired tokens", async () => {
    const teacher = await teacherAt();
    const forged = jwt.sign({}, "a-different-secret-that-is-long-enough-123", { subject: teacher.id });
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, env.JWT_ACCESS_SECRET, { subject: teacher.id });

    expect((await me()).status).toBe(401);
    expect((await me("not-a-token")).status).toBe(401);
    expect((await me(forged)).status).toBe(401);
    expect((await me(expired)).status).toBe(401);
  });

  it("returns the current user", async () => {
    const teacher = await teacherAt();
    const { accessToken } = await login(teacher);
    const res = await me(accessToken);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: teacher.id, email: teacher.email, role: "TEACHER" });
  });

  it("cuts a user off as soon as they are deactivated", async () => {
    const teacher = await teacherAt();
    const { accessToken } = await login(teacher);
    await prisma.user.update({ where: { id: teacher.id }, data: { status: "DEACTIVATED" } });
    expect((await me(accessToken)).status).toBe(403);
  });

  it("cuts a whole school off as soon as it is suspended", async () => {
    const school = await createSchool();
    const teacher = await teacherAt(school);
    const { accessToken } = await login(teacher);
    await prisma.school.update({ where: { id: school.id }, data: { status: "SUSPENDED" } });
    expect((await me(accessToken)).status).toBe(403);
  });
});

describe("sessions", () => {
  const refresh = (cookie?: string) => {
    const req = api().post("/api/v1/auth/refresh");
    return cookie ? req.set("Cookie", cookie) : req;
  };

  async function session() {
    const teacher = await teacherAt();
    return { teacher, ...(await login(teacher)) };
  }

  it("rotates the refresh token and issues a working access token", async () => {
    const { refreshCookie } = await session();
    const res = await refresh(refreshCookie);
    expect(res.status).toBe(200);
    expect(refreshCookieFrom(res)).toMatch(/^brillanda_refresh=.+/);
    expect(refreshCookieFrom(res)).not.toBe(refreshCookie);
    expect((await api().get("/api/v1/auth/me").set(bearer(res.body.accessToken))).status).toBe(200);
  });

  it("accepts a just-rotated token briefly, so parallel tabs stay logged in", async () => {
    const { refreshCookie } = await session();
    await refresh(refreshCookie);
    const otherTab = await refresh(refreshCookie);
    expect(otherTab.status).toBe(200);
    expect(refreshCookieFrom(otherTab)).toBeUndefined();
  });

  it("treats a long-rotated token as stolen and ends every session", async () => {
    const { teacher, refreshCookie } = await session();
    const newCookie = refreshCookieFrom(await refresh(refreshCookie))!;
    await prisma.refreshToken.updateMany({
      where: { userId: teacher.id, rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - REFRESH_GRACE_MS - 1000) },
    });

    expect((await refresh(refreshCookie)).status).toBe(401);
    expect((await refresh(newCookie)).status).toBe(401);
  });

  it("expires a session left idle too long (FR-22.4)", async () => {
    const { teacher, refreshCookie } = await session();
    await prisma.refreshToken.updateMany({
      where: { userId: teacher.id },
      data: { lastUsedAt: new Date(Date.now() - (env.SESSION_IDLE_TIMEOUT_HOURS + 1) * HOUR_MS) },
    });
    const res = await refresh(refreshCookie);
    expect(res.status).toBe(401);
    expect(refreshCookieFrom(res)).toBe("brillanda_refresh=");
  });

  it("expires a session past its maximum age", async () => {
    const { teacher, refreshCookie } = await session();
    await prisma.refreshToken.updateMany({ where: { userId: teacher.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await refresh(refreshCookie)).status).toBe(401);
  });

  it("rejects a refresh with no cookie", async () => {
    expect((await refresh()).status).toBe(401);
  });

  it("stops refreshing a deactivated user", async () => {
    const { teacher, refreshCookie } = await session();
    await prisma.user.update({ where: { id: teacher.id }, data: { status: "DEACTIVATED" } });
    expect((await refresh(refreshCookie)).status).toBe(403);
  });

  it("logs out for good, including a token rotated moments earlier", async () => {
    const { refreshCookie } = await session();
    const newCookie = refreshCookieFrom(await refresh(refreshCookie))!;

    const res = await api().post("/api/v1/auth/logout").set("Cookie", newCookie);
    expect(res.status).toBe(204);
    expect(refreshCookieFrom(res)).toBe("brillanda_refresh=");
    expect((await refresh(newCookie)).status).toBe(401);
    expect((await refresh(refreshCookie)).status).toBe(401);
  });
});

describe("POST /auth/access-code", () => {
  const post = (code: string) => api().post("/api/v1/auth/access-code").send({ code });

  async function parentWithCode(settings?: Record<string, boolean>) {
    const school = await createSchool(settings ? { settings } : {});
    const parent = await prisma.user.create({
      data: { schoolId: school.id, role: "PARENT", fullName: "Code Parent", status: "ACTIVE" },
    });
    const code = generateAccessCode();
    const record = await prisma.parentAccessCode.create({
      data: { schoolId: school.id, parentId: parent.id, codeHash: hashToken(normalizeAccessCode(code)) },
    });
    return { parent, code, record };
  }

  it("generates readable codes", () => {
    expect(generateAccessCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("logs a parent in with a code typed loosely", async () => {
    const { parent, code } = await parentWithCode();
    const res = await post(` ${code.toLowerCase().replaceAll("-", " ")} `);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: parent.id, role: "PARENT", email: null });
    expect(refreshCookieFrom(res)).toBeDefined();
  });

  it("rejects unknown and revoked codes", async () => {
    expect((await post(generateAccessCode())).status).toBe(401);
    const { code, record } = await parentWithCode();
    await prisma.parentAccessCode.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    expect((await post(code)).status).toBe(401);
  });

  it("respects a school that has turned codes off", async () => {
    const { code } = await parentWithCode({ parentAccessCodes: false });
    expect((await post(code)).status).toBe(403);
  });
});

describe("invites", () => {
  async function invite() {
    const school = await createSchool();
    const admin = await createUser(school.id, "SCHOOL_ADMIN");
    const { accessToken } = await login(admin);
    const email = `new-teacher-${uniqueId()}@test.local`;
    const res = await api()
      .post("/api/v1/users/invite")
      .set(bearer(accessToken))
      .send({ email, fullName: "New Teacher", role: "TEACHER" });
    expect(res.status).toBe(201);
    return { school, email, token: linkToken(email, "invite") };
  }

  const accept = (token: string, password = NEW_PASSWORD) =>
    api().post(`/api/v1/auth/invite/${token}/accept`).send({ password });

  it("shows who the invite is for", async () => {
    const { school, email, token } = await invite();
    const res = await api().get(`/api/v1/auth/invite/${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fullName: "New Teacher", email, role: "TEACHER", schoolName: school.name });
  });

  it("sets the password, activates the account and logs the user in", async () => {
    const { email, token } = await invite();
    const res = await accept(token);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, role: "TEACHER" });
    expect(refreshCookieFrom(res)).toBeDefined();
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).status).toBe("ACTIVE");
    await expect(login({ email }, NEW_PASSWORD)).resolves.toBeDefined();
  });

  it("works only once", async () => {
    const { token } = await invite();
    expect((await accept(token)).status).toBe(200);
    expect((await accept(token, "another-password")).status).toBe(404);
    expect((await api().get(`/api/v1/auth/invite/${token}`)).status).toBe(404);
  });

  it("expires after 72 hours (FR-7.1)", async () => {
    const { token } = await invite();
    await prisma.authToken.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await accept(token)).status).toBe(404);
  });

  it("sets a 72-hour expiry", async () => {
    const { token } = await invite();
    const { expiresAt, createdAt } = await prisma.authToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    expect(Math.round((expiresAt.getTime() - createdAt.getTime()) / HOUR_MS)).toBe(72);
  });

  it("enforces the password rule", async () => {
    const { token } = await invite();
    const res = await accept(token, "short");
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toEqual(["Use at least 8 characters"]);
  });
});

describe("password reset", () => {
  const forgot = (email: string | null) => api().post("/api/v1/auth/forgot-password").send({ email });
  const reset = (token: string, password = NEW_PASSWORD) =>
    api().post("/api/v1/auth/reset-password").send({ token, password });

  it("answers the same whether or not the email has an account", async () => {
    const teacher = await teacherAt();
    const unknownEmail = `nobody-${uniqueId()}@test.local`;
    const known = await forgot(teacher.email);
    const unknown = await forgot(unknownEmail);

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(lastEmailTo(teacher.email!)).toBeDefined();
    expect(lastEmailTo(unknownEmail)).toBeUndefined();
  });

  it("changes the password and ends existing sessions", async () => {
    const teacher = await teacherAt();
    const { refreshCookie } = await login(teacher);
    await forgot(teacher.email);
    const token = linkToken(teacher.email!, "reset-password");

    expect((await reset(token)).status).toBe(204);

    await expect(login(teacher)).rejects.toThrow(/401/);
    await expect(login(teacher, NEW_PASSWORD)).resolves.toBeDefined();
    expect((await api().post("/api/v1/auth/refresh").set("Cookie", refreshCookie)).status).toBe(401);
    expect((await reset(token, "yet-another-password")).status).toBe(400);
  });

  it("only honours the newest reset link", async () => {
    const teacher = await teacherAt();
    await forgot(teacher.email);
    const first = linkToken(teacher.email!, "reset-password");
    await forgot(teacher.email);
    const second = linkToken(teacher.email!, "reset-password");

    expect(second).not.toBe(first);
    expect((await reset(first)).status).toBe(400);
    expect((await reset(second)).status).toBe(204);
  });
});
