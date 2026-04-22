import { z } from "zod";
import { auditable, withId } from "./common";

// Staff = usuarios autenticados. El `id` del doc coincide con el uid de
// Firebase Auth. El rol se duplica en custom claims para enforcement en rules.
export const staffRole = z.enum(["admin", "reception", "therapist"]);

export const staffInputSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  role: staffRole,
  active: z.boolean().default(true),
});

export const staffSchema = staffInputSchema.and(auditable);
export const staffWithIdSchema = withId(staffSchema);
export type StaffInput = z.infer<typeof staffInputSchema>;
export type Staff = z.infer<typeof staffWithIdSchema>;
export type StaffRole = z.infer<typeof staffRole>;
