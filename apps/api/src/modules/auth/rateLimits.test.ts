import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createLimiter } from "./rateLimits";

describe("auth rate limits", () => {
  it("limits guesses per account without locking out others on the same network", async () => {
    const app = express();
    app.use(express.json());
    app.post("/login", createLimiter({ windowMs: 60_000, limit: 2, keyByEmail: true, enabledInTests: true }), (_req, res) => {
      res.sendStatus(204);
    });
    const attempt = (email: string) => request(app).post("/login").send({ email });

    expect((await attempt("teacher@test.local")).status).toBe(204);
    expect((await attempt(" TEACHER@test.local ")).status).toBe(204);

    const blocked = await attempt("teacher@test.local");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many attempts/i);

    expect((await attempt("colleague@test.local")).status).toBe(204);
  });
});
