import { z } from "zod";
import { emailField } from "../auth/schema";

// Parents are invited with their child's record (students module), not from here.
export const InviteUserBody = z.object({
  email: emailField,
  fullName: z.string().trim().min(2, "Enter the person's full name").max(120),
  role: z.enum(["TEACHER", "SCHOOL_ADMIN"], {
    errorMap: () => ({ message: "Choose Teacher or School admin" }),
  }),
  phone: z.string().trim().max(30).optional(),
});

export type InviteUserInput = z.infer<typeof InviteUserBody>;
