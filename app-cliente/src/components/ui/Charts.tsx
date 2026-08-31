import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, font, fonts } from "@/theme";

// Gráficas del panel. Todas son de UNA sola serie, así que el color no carga
// identidad: la altura o el largo de la barra ya dice todo, y el texto va
// siempre en tinta, nunca en el color del dato.
//
// Especificaciones fijas: barra de 24 px como máximo, punta redondeada de 4 px
// y escuadrada en la línea base, ejes de un solo pelo y etiqueta directa solo
// en el valor extremo (etiquetar todo hace que no se lea ninguno).

const ORO = colors.gold;
const PISTA = colors.cardLine;

// ── Columnas: una magnitud a lo largo del tiempo ────────────────────────────
export function ColumnChart({
  data,
  format,
  height = 96,
}: {
  data: { label: string; total: number }[];
  format: (n: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const hayDatos = data.some((d) => d.total > 0);

  return (
    <View>
      <View style={[styles.cols, { height: height + 18 }]}>
        {data.map((d, i) => {
          const alto = Math.round((d.total / max) * height);
          const esMax = hayDatos && d.total === max;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <Text style={[styles.colValor, esMax && styles.colValorMax]} numberOfLines={1}>
                {esMax ? format(d.total) : ""}
              </Text>
              <View style={[styles.colPista, { height }]}>
                {d.total > 0 ? (
                  <View style={[styles.columna, { height: Math.max(4, alto) }]} />
                ) : (
                  // Un día sin ventas conserva su lugar con un tope del color
                  // del eje: se ve que existe, sin fingir que vale algo.
                  <View style={styles.columnaCero} />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.base} />
      <View style={styles.cols}>
        {data.map((d, i) => (
          <View key={`lbl-${d.label}-${i}`} style={styles.col}>
            <Text style={styles.colEtiqueta} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Barras ordenadas: magnitud con identidad en la etiqueta, no en el color ──
export function RankedBars({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.filas}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`}>
          <View style={styles.filaTop}>
            <Text style={styles.filaEtiqueta} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.filaValor}>{format(d.value)}</Text>
          </View>
          <View style={styles.filaPista}>
            <View
              style={[styles.filaBarra, { width: `${Math.max(2, (d.value / max) * 100)}%` }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Medidor: una parte sobre un total ───────────────────────────────────────
export function Meter({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <View style={styles.filaPista}>
      <View style={[styles.filaBarra, { width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  col: { flex: 1, alignItems: "center" },
  colPista: { justifyContent: "flex-end", width: "100%", alignItems: "center" },
  columna: {
    width: "76%",
    maxWidth: 24,
    backgroundColor: ORO,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  columnaCero: { width: "76%", maxWidth: 24, height: 2, backgroundColor: PISTA },
  colValor: {
    fontSize: 10,
    height: 14,
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  colValorMax: { color: colors.textOnCard, fontFamily: fonts.extrabold },
  base: { height: 1, backgroundColor: PISTA },
  colEtiqueta: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: 6,
    textTransform: "capitalize",
    fontFamily: fonts.regular,
  },

  filas: { gap: spacing.md },
  filaTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 5,
  },
  filaEtiqueta: {
    flex: 1,
    fontSize: font.size.md,
    color: colors.textOnCard,
    fontFamily: fonts.regular,
  },
  filaValor: { fontSize: font.size.md, color: colors.textOnCard, fontFamily: fonts.bold },
  filaPista: { height: 8, backgroundColor: PISTA, borderRadius: 4, overflow: "hidden" },
  filaBarra: {
    height: 8,
    backgroundColor: ORO,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
