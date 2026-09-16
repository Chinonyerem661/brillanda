import type { User } from "@prisma/client";
import { writeAudit } from "../../lib/audit";
import { sendEmail } from "../../lib/email";
import { env } from "../../lib/env";
import { HttpError } from "../../lib/httpError";
import { prisma } from "../../lib/prisma";
import { withTenant } from "../../middleware/tenantScope";
import { INVITE_TTL_MS, issueAuthToken } from "../auth/service";
import type { InviteUserInput } from "./schema";

function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
  };
}

const ROLE_LABELS = { TEACHER: "a teacher", SCHOOL_ADMIN: "a school admin" } as const;

/** Invites a teacher or admin (FR-7.1). Inviting someone whose invite is still pending re-sends it with a fresh link. */
export async function inviteUser(actorId: string, schoolId: string, input: InviteUserInput) {
  // Emails are unique across every school (DECISIONS.md D-4), so this lookup is deliberately unscoped.
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const isResend = existing !== null && existing.schoolId === schoolId && existing.status === "INVITED";
  if (existing && !isResend) {
    throw new HttpError(409, "This email is already in use.", { email: ["This email is already in use."] });
  }

  const db = withTenant(schoolId);
  const details = { fullName: input.fullName, role: input.role, phone: input.phone ?? null };

  const { user, token } = await db.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: details })
      : await tx.user.create({ data: { ...details, schoolId, email: input.email, status: "INVITED" } });
    const token = await issueAuthToken(tx, user.id, "INVITE", INVITE_TTL_MS);
    await writeAudit(tx, {
      schoolId,
      userId: actorId,
      action: isResend ? "USER_INVITE_RESENT" : "USER_INVITED",
      entityType: "User",
      entityId: user.id,
      newValue: { email: input.email, ...details },
    });
    return { user, token };
  });

  const school = await db.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true } });
  try {
    await sendEmail({
      to: input.email,
      subject: `You're invited to ${school.name} on Brillanda`,
      text: [
        `Hello ${input.fullName},`,
        "",
        `${school.name} has added you to Brillanda as ${ROLE_LABELS[input.role]}.`,
        "",
        "Open this link to set your password. It expires in 3 days:",
        "",
        `${env.WEB_APP_URL}/invite/${token}`,
        "",
        "If you weren't expecting this, you can ignore this email.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Invite email failed", err);
    throw new HttpError(502, "The invite was saved, but the email couldn't be sent. Please try sending it again.");
  }

  return { user: toUserDto(user), resent: isResend };
}
