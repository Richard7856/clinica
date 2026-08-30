// Tipografía de marca (la misma de la propuesta de Cloudancy):
//   Newsreader — serif, para títulos y cifras grandes.
//   Mulish     — sans, para todo el texto de interfaz.
//
// En React Native cada peso es una familia distinta: no basta con fontWeight,
// hay que nombrar la familia exacta. Estos tokens evitan escribirla a mano.

export const fonts = {
  // Serif (títulos)
  display: "Newsreader_300Light",
  displayRegular: "Newsreader_400Regular",
  displayMedium: "Newsreader_500Medium",
  displaySemi: "Newsreader_600SemiBold",
  // Sans (interfaz)
  regular: "Mulish_400Regular",
  medium: "Mulish_500Medium",
  semibold: "Mulish_600SemiBold",
  bold: "Mulish_700Bold",
  extrabold: "Mulish_800ExtraBold",
} as const;

// Peso numérico → familia de Mulish. Se usa al migrar estilos existentes.
export const sansByWeight: Record<string, string> = {
  "400": fonts.regular,
  "500": fonts.medium,
  "600": fonts.semibold,
  "700": fonts.bold,
  "800": fonts.extrabold,
};
