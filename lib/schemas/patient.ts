import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Paciente: entidad central. `qrSlug` es un identificador corto imprimible
// en la ficha del paciente y escaneado en /checkin.
export const patientInputSchema = z.object({
  fullName: z.string().min(2).max(120),
  doc: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  birthDate: isoDate.optional(),
  notes: z.string().max(2000).optional(),
});

export const patientSchema = patientInputSchema.extend({
  qrSlug: z.string().min(6).max(32),
  points: z.number().int().nonnegative().default(0),
}).and(auditable);

export const patientWithIdSchema = withId(patientSchema);

export type PatientInput = z.infer<typeof patientInputSchema>;
export type Patient = z.infer<typeof patientWithIdSchema>;

// Subcolección: patients/{patientId}/history
export const historyEntryInputSchema = z.object({
  date: isoDate,
  type: z.enum(["consulta", "tratamiento", "observacion"]),
  notes: z.string().max(4000),
  allergies: z.string().max(500).optional(),
  medications: z.string().max(500).optional(),
  attachments: z.array(z.string().url()).default([]),
  createdBy: z.string(), // staff uid
});

export const historyEntrySchema = historyEntryInputSchema.and(auditable);
export const historyEntryWithIdSchema = withId(historyEntrySchema);

export type HistoryEntryInput = z.infer<typeof historyEntryInputSchema>;
export type HistoryEntry = z.infer<typeof historyEntryWithIdSchema>;
