import nodemailer from "nodemailer";
import { env } from "./env";

export type EmailMessage = { to: string; subject: string; text: string };

/** In tests, emails are collected here instead of being sent. */
export const testOutbox: EmailMessage[] = [];

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (env.NODE_ENV === "test") {
    testOutbox.push(message);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, ...message });
}
