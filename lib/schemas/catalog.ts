import { z } from "zod";
import { auditable, withId } from "./common";

// Catálogos: tratamientos, cabinas, aparatos. Administrados desde /settings.

export const treatmentInputSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().max(40).optional(),
  basePrice: z.number().nonnegative(),
  durationMin: z.number().int().positive().max(600),
  requiresCabin: z.boolean().default(true),
  deviceIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});
export const treatmentSchema = treatmentInputSchema.and(auditable);
export const treatmentWithIdSchema = withId(treatmentSchema);
export type TreatmentInput = z.infer<typeof treatmentInputSchema>;
export type Treatment = z.infer<typeof treatmentWithIdSchema>;

export const cabinInputSchema = z.object({
  name: z.string().min(1).max(40),
  status: z.enum(["active", "maintenance", "disabled"]).default("active"),
  notes: z.string().max(500).optional(),
});
export const cabinSchema = cabinInputSchema.and(auditable);
export const cabinWithIdSchema = withId(cabinSchema);
export type CabinInput = z.infer<typeof cabinInputSchema>;
export type Cabin = z.infer<typeof cabinWithIdSchema>;

export const deviceInputSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.string().max(40).optional(),
  cabinId: z.string().optional(), // null/undefined si es portátil
  status: z.enum(["active", "maintenance", "disabled"]).default("active"),
});
export const deviceSchema = deviceInputSchema.and(auditable);
export const deviceWithIdSchema = withId(deviceSchema);
export type DeviceInput = z.infer<typeof deviceInputSchema>;
export type Device = z.infer<typeof deviceWithIdSchema>;
