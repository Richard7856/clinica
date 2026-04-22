import { z } from "zod";
import { auditable, isoDate, withId } from "./common";

// Movimiento de puntos. `earned` se crea automático al confirmar pago,
// `redeemed` es manual desde la ficha del paciente.
export const rewardInputSchema = z.object({
  patientId: z.string(),
  type: z.enum(["earned", "redeemed"]),
  points: z.number().int(), // positivo, el signo lo decide type
  reason: z.string().max(200),
  refId: z.string().optional(), // paymentId para earned, sessionId/etc para redeemed
  date: isoDate,
});

export const rewardSchema = rewardInputSchema.and(auditable);
export const rewardWithIdSchema = withId(rewardSchema);
export type RewardInput = z.infer<typeof rewardInputSchema>;
export type Reward = z.infer<typeof rewardWithIdSchema>;
