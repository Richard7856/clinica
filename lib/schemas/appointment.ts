import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Cita agendada. Relaciona paciente, tratamiento, cabina y staff en una
// ventana temporal. No es una sesión realizada — eso es otra colección.
export const appointmentStatus = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "no_show",
  "cancelled",
]);

export const appointmentInputSchema = z.object({
  patientId: z.string(),
  treatmentId: z.string(),
  cabinId: z.string(),
  staffId: z.string(),
  startAt: isoDate,
  endAt: isoDate,
  status: appointmentStatus.default("scheduled"),
  notes: z.string().max(1000).optional(),
});

export const appointmentSchema = appointmentInputSchema.and(auditable);
export const appointmentWithIdSchema = withId(appointmentSchema);
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
export type Appointment = z.infer<typeof appointmentWithIdSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatus>;
