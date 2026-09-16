import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

// Length only, no composition rules (NIST SP 800-63B): easier for non-technical users, no weaker in practice.
// 72 bytes is where bcrypt stops reading.
export const newPasswordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((value) => Buffer.byteLength(value) <= 72, "Use at most 72 characters");

export const LoginBody = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export const AccessCodeBody = z.object({
  code: z.string().trim().min(1, "Enter your access code").max(40),
});

export const AcceptInviteBody = z.object({
  password: newPasswordField,
});

export const ForgotPasswordBody = z.object({
  email: emailField,
});

export const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: newPasswordField,
});
