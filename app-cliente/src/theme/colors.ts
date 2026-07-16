// Paleta de marca L'Ecrobelle — negro + dorado, tomada de la propuesta de
// diseño de Cloudancy. Los "Cisnes" (puntos) usan el dorado como color propio.

export const colors = {
  ground: "#0d0d0f",
  panel: "#141416",
  line: "#26262b",

  gold: "#c9a24b",
  goldSoft: "#e4c987",
  goldDeep: "#a5822f",

  cream: "#f6f2ea",
  ink: "#12100c",
  muted: "#8b857a",
  rose: "#e7c9c1",

  ok: "#7bb89a",
  danger: "#d98a7a",

  // sobre fondo claro (pantallas internas tipo tarjeta)
  cardBg: "#ffffff",
  cardLine: "#e7e0d3",
  textOnCard: "#12100c",
  subtleOnCard: "#7a7365",
} as const;

export type Colors = typeof colors;
