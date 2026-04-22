import { z } from "zod";
import { auditable } from "./common";

// Doc único en settings/clinic. `pointsRate` = puntos ganados por unidad
// monetaria (ej. 1 = 1 punto por $1 cobrado).
export const clinicSettingsSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  timezone: z.string().default("America/Argentina/Buenos_Aires"),
  pointsRate: z.number().nonnegative().default(0),
  logoUrl: z.string().url().optional(),
}).and(auditable);

export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;
