import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Check-in: registro automático cuando se escanea el QR del paciente en
// recepción. `appointmentId` se setea si coincide con una cita del día.
export const checkinInputSchema = z.object({
  patientId: z.string(),
  timestamp: isoDate,
  reason: z.enum(["session", "consultation", "payment", "other"]).default("session"),
  attendedBy: z.string(), // staff uid que escaneó
  appointmentId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const checkinSchema = checkinInputSchema.and(auditable);
export const checkinWithIdSchema = withId(checkinSchema);
export type CheckinInput = z.infer<typeof checkinInputSchema>;
export type Checkin = z.infer<typeof checkinWithIdSchema>;
