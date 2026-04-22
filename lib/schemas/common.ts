import { z } from "zod";

// Valores compartidos por todas las entidades. Usamos ISO strings para fechas
// en el tipo de cara a UI; la capa repository se encarga de convertir a/desde
// Firestore Timestamp.
export const isoDate = z.string().datetime({ offset: true });

export const withId = <T extends z.ZodTypeAny>(schema: T) =>
  schema.and(z.object({ id: z.string() }));

export const auditable = z.object({
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Id = string;
