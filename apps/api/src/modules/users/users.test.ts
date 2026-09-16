import { describe, expect, it } from "vitest";
import {
  api,
  bearer,
  createSchool,
  createUser,
  lastEmailTo,
  linkToken,
  login,
  uniqueId,
} from "../../../tests/helpers";
import { prisma } from "../../lib/prisma";

async function adminSession() {
  const school = await createSchool();
  const admin = await createUser(school.id, "SCHOOL_ADMIN");
  return { school, admin, ...(await login(admin)) };
}

const invite = (token: string, body: object) => api().post("/api/v1/users/invite").set(bearer(token)).send(body);
const newEmail = () => `invitee-${uniqueId()}@test.local`;

describe("POST /users/invite", () => {
  it("creates an invited user in the admin's school, emails a link and audits it", async () => {
    const { school, admin, accessToken } = await adminSession();
    const email = newEmail();

    const res = await invite(accessToken, { email: email.toUpperCase(), fullName: "Ada Teacher", role: "TEACHER" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ resent: false, user: { email, fullName: "Ada Teacher", role: "TEACHER", status: "INVITED" } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.schoolId).toBe(school.id);
    expect(user.passwordHash).toBeNull();
    expect(lastEmailTo(email)?.text).toContain(school.name);
    expect(linkToken(email, "invite")).toBeTruthy();
    await expect(prisma.auditLog.findFirst({ where: { entityId: user.id } })).resolves.toMatchObject({
      schoolId: school.id,
      userId: admin.id,
      action: "USER_INVITED",
    });
  });

  it("ignores a schoolId smuggled into the body", async () => {
    const { school, accessToken } = await adminSession();
    const otherSchool = await createSchool();
    const email = newEmail();

    const res = await invite(accessToken, { email, fullName: "Sneaky", role: "TEACHER", schoolId: otherSchool.id });

    expect(res.status).toBe(201);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).schoolId).toBe(school.id);
  });

  it("refuses an email already used at any school", async () => {
    const { accessToken } = await adminSession();
    const elsewhere = await createUser((await createSchool()).id, "TEACHER");

    const res = await invite(accessToken, { email: elsewhere.email, fullName: "Someone", role: "TEACHER" });

    expect(res.status).toBe(409);
    expect(res.body.fields.email).toBeDefined();
  });

  it("re-sends a pending invite and retires the old link", async () => {
    const { accessToken } = await adminSession();
    const email = newEmail();
    await invite(accessToken, { email, fullName: "Slow Responder", role: "TEACHER" });
    const oldToken = linkToken(email, "invite");

    const res = await invite(accessToken, { email, fullName: "Slow Responder", role: "TEACHER" });

    expect(res.status).toBe(200);
    expect(res.body.resent).toBe(true);
    const newToken = linkToken(email, "invite");
    expect(newToken).not.toBe(oldToken);
    expect((await api().get(`/api/v1/auth/invite/${oldToken}`)).status).toBe(404);
    expect((await api().get(`/api/v1/auth/invite/${newToken}`)).status).toBe(200);
  });

  it("won't take over another school's pending invite", async () => {
    const schoolA = await adminSession();
    const schoolB = await adminSession();
    const email = newEmail();
    expect((await invite(schoolB.accessToken, { email, fullName: "Wanted", role: "TEACHER" })).status).toBe(201);

    const res = await invite(schoolA.accessToken, { email, fullName: "Wanted", role: "TEACHER" });

    expect(res.status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).schoolId).toBe(schoolB.school.id);
  });

  it("only invites teachers and school admins", async () => {
    const { accessToken } = await adminSession();
    for (const role of ["PARENT", "SUPER_ADMIN", "STUDENT"]) {
      const res = await invite(accessToken, { email: newEmail(), fullName: "Wrong Role", role });
      expect(res.status).toBe(400);
      expect(res.body.fields.role).toEqual(["Choose Teacher or School admin"]);
    }
  });

  it("is for school admins only (FR-22.3)", async () => {
    const school = await createSchool();
    const body = { email: newEmail(), fullName: "Nobody", role: "TEACHER" };

    expect((await api().post("/api/v1/users/invite").send(body)).status).toBe(401);
    for (const role of ["TEACHER", "PARENT", "STUDENT"] as const) {
      const { accessToken } = await login(await createUser(school.id, role));
      expect((await invite(accessToken, body)).status).toBe(403);
    }
    const { accessToken: superAdminToken } = await login(await createUser(null, "SUPER_ADMIN"));
    expect((await invite(superAdminToken, body)).status).toBe(403);
  });
});
