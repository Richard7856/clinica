import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Paquete de N sesiones compradas por un paciente. `usedSessions` se
// incrementa en transacción al registrar una sesión.
export const packageInputSchema = z.object({
  patientId: z.string(),
  treatmentId: z.string(),
  totalSessions: z.number().int().positive(),
  price: z.number().nonnegative(),
  purchasedAt: isoDate,
  expiresAt: isoDate.optional(),
  notes: z.string().max(500).optional(),
});

export const packageSchema = packageInputSchema.extend({
  usedSessions: z.number().int().nonnegative().default(0),
  status: z.enum(["active", "completed", "expired", "cancelled"]).default("active"),
}).and(auditable);

export const packageWithIdSchema = withId(packageSchema);
export type PackageInput = z.infer<typeof packageInputSchema>;
export type Package = z.infer<typeof packageWithIdSchema>;
