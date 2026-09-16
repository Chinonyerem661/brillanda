import { z } from "zod";
import { DEFAULT_SCHOOL_SETTINGS, type SchoolSettings } from "@brillanda/shared-types";

export const SchoolSettingsSchema = z.object({
  positionScope: z.enum(["ARM", "CLASS"]),
  tieMode: z.enum(["COMPETITION", "DENSE"]),
  studentSelfView: z.boolean(),
  parentAccessCodes: z.boolean(),
}) satisfies z.ZodType<SchoolSettings>;

/** Stored settings over the defaults, so a setting added later needs no data migration. */
export function readSchoolSettings(stored: unknown): SchoolSettings {
  const parsed = SchoolSettingsSchema.partial().safeParse(stored);
  return { ...DEFAULT_SCHOOL_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}
