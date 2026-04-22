import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Pago. `concept` indica qué se está cobrando y `refId` apunta a ese doc
// (packageId si concept=package, sessionId si concept=session, etc.).
export const paymentMethod = z.enum(["cash", "transfer", "card", "other"]);
export const paymentConcept = z.enum(["package", "session", "product", "other"]);

export const paymentInputSchema = z.object({
  patientId: z.string(),
  amount: z.number().positive(),
  method: paymentMethod,
  concept: paymentConcept,
  refId: z.string().optional(),
  date: isoDate,
  receivedBy: z.string(), // staff uid
  notes: z.string().max(500).optional(),
});

export const paymentSchema = paymentInputSchema.and(auditable);
export const paymentWithIdSchema = withId(paymentSchema);
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type Payment = z.infer<typeof paymentWithIdSchema>;
export type PaymentMethod = z.infer<typeof paymentMethod>;
export type PaymentConcept = z.infer<typeof paymentConcept>;
