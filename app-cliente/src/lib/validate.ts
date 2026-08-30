// Validadores simples: devuelven el mensaje de error o undefined si está bien.
// Se usan con el kit de formularios para mostrar el error debajo del campo.

export type Errors<T extends string> = Partial<Record<T, string>>;

export function texto(v: string, min = 2, campo = "Este campo"): string | undefined {
  const t = v.trim();
  if (!t) return `${campo} es obligatorio.`;
  if (t.length < min) return `${campo} debe tener al menos ${min} caracteres.`;
  return undefined;
}

export function numero(
  v: string,
  { min, max, campo = "El valor" }: { min?: number; max?: number; campo?: string } = {},
): string | undefined {
  const t = v.trim();
  if (!t) return `${campo} es obligatorio.`;
  const n = Number(t);
  if (!Number.isFinite(n)) return `${campo} debe ser un número.`;
  if (min !== undefined && n < min) return `${campo} debe ser mayor o igual a ${min}.`;
  if (max !== undefined && n > max) return `${campo} debe ser menor o igual a ${max}.`;
  return undefined;
}

export function opcional(): undefined {
  return undefined;
}

// true si no hay ningún error en el objeto.
export function esValido<T extends string>(e: Errors<T>): boolean {
  return Object.values(e).every((x) => !x);
}
