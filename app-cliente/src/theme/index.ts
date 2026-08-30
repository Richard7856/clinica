import { colors } from "./colors";

// Escala tipográfica y espaciado. React Native no tiene rem: usamos números
// absolutos (density-independent pixels).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 100,
} as const;

export const font = {
  // React Native usa la fuente del sistema por defecto. Para la marca
  // (wordmark ligero, tipo serif) se pueden cargar fuentes con expo-font más
  // adelante; por ahora usamos pesos del sistema.
  size: {
    xs: 11,
    sm: 12.5,
    md: 14,
    lg: 16,
    xl: 20,
    display: 40,
  },
} as const;

export { fonts, sansByWeight } from "./typography";
import { fonts } from "./typography";

export const theme = { colors, spacing, radius, font, fonts } as const;
export type Theme = typeof theme;
export { colors };
