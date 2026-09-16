import { randomUUID } from "node:crypto";
import type { Role, SchoolStatus, UserStatus } from "@prisma/client";
import request from "supertest";
import { createApp } from "../src/app";
import { testOutbox } from "../src/lib/email";
import { hashPassword } from "../src/lib/passwords";
import { prisma } from "../src/lib/prisma";
import { REFRESH_COOKIE } from "../src/modules/auth/router";

// Tests share one database and run in parallel, so every record gets a unique name.

const app = createApp();
export const api = () => request(app);

export const PASSWORD = "correct-horse-battery";

export const uniqueId = () => randomUUID().slice(0, 8);

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export function createSchool(data: { status?: SchoolStatus; settings?: Record<string, string | boolean> } = {}) {
  const id = uniqueId();
  return prisma.school.create({ data: { name: `Test School ${id}`, slug: `test-${id}`, ...data } });
}

export async function createUser(
  schoolId: string | null,
  role: Role,
  options: { status?: UserStatus; password?: string | null } = {},
) {
  const password = options.password === undefined ? PASSWORD : options.password;
  return prisma.user.create({
    data: {
      schoolId,
      role,
      email: `${role.toLowerCase()}-${uniqueId()}@test.local`,
      fullName: `Test ${role} ${uniqueId()}`,
      passwordHash: password === null ? null : await hashPassword(password),
      status: options.status ?? "ACTIVE",
    },
  });
}

/** The `brillanda_refresh=...` pair a response set, "brillanda_refresh=" if it cleared it, or undefined. */
export function refreshCookieFrom(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = res.headers["set-cookie"];
  return (Array.isArray(cookies) ? cookies.map(String) : [])
    .find((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`))
    ?.split(";")[0];
}

export async function login(user: { email: string | null }, password = PASSWORD) {
  const res = await api().post("/api/v1/auth/login").send({ email: user.email, password });
  if (res.status !== 200) throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  const refreshCookie = refreshCookieFrom(res);
  if (!refreshCookie) throw new Error("Login did not set a refresh cookie");
  return { accessToken: res.body.accessToken as string, refreshCookie };
}

export function lastEmailTo(address: string) {
  return [...testOutbox].reverse().find((message) => message.to === address);
}

/** Pulls the token out of an emailed invite or reset link. */
export function linkToken(address: string, path: "invite" | "reset-password"): string {
  const match = lastEmailTo(address)?.text.match(new RegExp(`/${path}/([A-Za-z0-9_-]+)`));
  if (!match?.[1]) throw new Error(`No ${path} link emailed to ${address}`);
  return match[1];
}
