import type { Role } from "@brillanda/shared-types";

/**
 * Sign-in accounts for looking around in development, one per portal (DECISIONS.md D-7a). Only the
 * stand-in API knows them; production builds leave this module out, and any other email still goes
 * to the real API.
 */
export const SAMPLE_PASSWORD = "brillanda";

export const SAMPLE_ACCOUNTS: { email: string; role: Role; fullName: string; label: string }[] = [
  { email: "admin@greenfield.sample", role: "SCHOOL_ADMIN", fullName: "Funmilayo Adeyemi", label: "School admin" },
  { email: "teacher@greenfield.sample", role: "TEACHER", fullName: "Tunde Bakare", label: "Teacher" },
  { email: "parent@greenfield.sample", role: "PARENT", fullName: "Ngozi Okafor", label: "Parent" },
  { email: "team@brillanda.sample", role: "SUPER_ADMIN", fullName: "Kelechi Obi", label: "Brillanda team" },
];
