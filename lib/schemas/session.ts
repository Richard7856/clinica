import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Sesión realizada: registro individual. Si proviene de un paquete,
// `packageId` está seteado y la transacción incrementa usedSessions.
export const sessionInputSchema = z.object({
  patientId: z.string(),
  treatmentId: z.string(),
  packageId: z.string().optional(),
  sessionNumber: z.number().int().positive(), // número dentro del paquete, o 1 si es suelta
  date: isoDate,
  cabinId: z.string(),
  deviceId: z.string().optional(),
  performedBy: z.string(), // staff uid
  notes: z.string().max(2000).optional(),
  beforePhoto: z.string().url().optional(),
  afterPhoto: z.string().url().optional(),
});

export const sessionSchema = sessionInputSchema.and(auditable);
export const sessionWithIdSchema = withId(sessionSchema);

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type Session = z.infer<typeof sessionWithIdSchema>;
