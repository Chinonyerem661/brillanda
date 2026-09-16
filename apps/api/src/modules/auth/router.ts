import { Router, type CookieOptions, type Response } from "express";
import { env } from "../../lib/env";
import { currentUser, requireAuth } from "../../middleware/auth";
import { accessCodeLimiter, forgotPasswordLimiter, loginPerAccountLimiter, loginPerIpLimiter } from "./rateLimits";
import { AcceptInviteBody, AccessCodeBody, ForgotPasswordBody, LoginBody, ResetPasswordBody } from "./schema";
import * as auth from "./service";

export const REFRESH_COOKIE = "brillanda_refresh";

// The refresh token never reaches JavaScript: it lives in an httpOnly cookie sent only to
// /api/v1/auth. The short-lived access token goes in the response body (DECISIONS.md F-23).
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
};

function sendSession(res: Response, session: auth.Session) {
  if (session.refreshToken) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions, expires: session.refreshExpiresAt });
  }
  res.json({ accessToken: session.accessToken, user: session.user });
}

export const authRouter = Router();

authRouter.post("/login", loginPerIpLimiter, loginPerAccountLimiter, async (req, res) => {
  const { email, password } = LoginBody.parse(req.body ?? {});
  sendSession(res, await auth.login(email, password));
});

authRouter.post("/access-code", accessCodeLimiter, async (req, res) => {
  const { code } = AccessCodeBody.parse(req.body ?? {});
  sendSession(res, await auth.loginWithAccessCode(code));
});

authRouter.post("/refresh", async (req, res) => {
  try {
    sendSession(res, await auth.refreshSession(req.cookies[REFRESH_COOKIE]));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
});

authRouter.post("/logout", async (req, res) => {
  await auth.logout(req.cookies[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await auth.getCurrentUser(currentUser(req).id) });
});

authRouter.get("/invite/:token", async (req, res) => {
  res.json(await auth.getInvite(req.params.token));
});

authRouter.post("/invite/:token/accept", async (req, res) => {
  const { password } = AcceptInviteBody.parse(req.body ?? {});
  sendSession(res, await auth.acceptInvite(req.params.token, password));
});

authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = ForgotPasswordBody.parse(req.body ?? {});
  await auth.requestPasswordReset(email);
  res.status(202).json({ message: "If an account exists for that email, we've sent a link to reset the password." });
});

authRouter.post("/reset-password", async (req, res) => {
  const { token, password } = ResetPasswordBody.parse(req.body ?? {});
  await auth.resetPassword(token, password);
  res.status(204).end();
});
