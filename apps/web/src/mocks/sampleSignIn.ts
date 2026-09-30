import { http, HttpResponse, passthrough } from "msw";
import type { SessionResponse } from "@brillanda/shared-types";
import { SAMPLE_ACCOUNTS, SAMPLE_PASSWORD } from "../shared/api/sampleAccounts";

// Stand-in sign-in for the sample accounts, so every portal can be opened without the API running
// (DECISIONS.md D-7a). Unknown emails pass through to the real API untouched. The signed-in sample
// account is kept for the tab's lifetime, standing in for the refresh cookie.

const SESSION_KEY = "brillanda:sample-session";
const SCHOOL = { id: "school-greenfield", name: "Greenfield College", slug: "greenfield", logoUrl: null };

function sessionFor(email: string): SessionResponse | null {
  const account = SAMPLE_ACCOUNTS.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!account) return null;
  return {
    accessToken: `sample-token-${account.role.toLowerCase()}`,
    user: {
      id: `sample-${account.role.toLowerCase()}`,
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      school: account.role === "SUPER_ADMIN" ? null : SCHOOL,
    },
  };
}

const storedEmail = () => sessionStorage.getItem(SESSION_KEY);

export const sampleSignInHandlers = [
  http.post("/api/v1/auth/login", async ({ request }) => {
    const { email = "", password = "" } = (await request.clone().json()) as { email?: string; password?: string };
    const session = sessionFor(email);
    if (!session) return passthrough();
    if (password !== SAMPLE_PASSWORD) {
      return HttpResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    sessionStorage.setItem(SESSION_KEY, session.user.email!);
    return HttpResponse.json(session);
  }),

  http.post("/api/v1/auth/refresh", () => {
    const email = storedEmail();
    const session = email ? sessionFor(email) : null;
    return session ? HttpResponse.json(session) : passthrough();
  }),

  http.post("/api/v1/auth/logout", () => {
    if (!storedEmail()) return passthrough();
    sessionStorage.removeItem(SESSION_KEY);
    return new HttpResponse(null, { status: 204 });
  }),
];
