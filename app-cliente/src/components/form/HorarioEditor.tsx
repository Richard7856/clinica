import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Horario } from "@/lib/types";

export const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Devuelve los 7 días en orden, completando los que falten como cerrados.
export function horarioCompleto(lista: Horario[] | undefined): Horario[] {
  return DIAS_SEMANA.map((dia) => {
    const h = lista?.find((x) => x.dia === dia);
    return { dia, h: h?.h ?? "Cerrado" };
  });
}

// Editor de la semana. Un día vacío significa cerrado — no hay que escribir
// la palabra ni buscar un interruptor aparte.
export function HorarioEditor({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: Horario[];
  onChange: (v: Horario[]) => void;
}) {
  function set(dia: string, h: string) {
    onChange(value.map((x) => (x.dia === dia ? { ...x, h } : x)));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}

      {value.map((d) => {
        const cerrado = !d.h || /cerrado/i.test(d.h);
        return (
          <View key={d.dia} style={styles.fila}>
            <Text style={styles.dia}>{d.dia}</Text>
            <TextInput
              style={[styles.input, cerrado && styles.inputCerrado]}
              value={cerrado ? "" : d.h}
              onChangeText={(t) => set(d.dia, t.trim() ? t : "Cerrado")}
              placeholder="Cerrado"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  helper: {
    fontSize: font.size.xs,
    color: colors.subtleOnCard,
    fontFamily: fonts.regular,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  fila: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 6 },
  dia: {
    width: 82,
    fontSize: font.size.sm,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.sm,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: font.size.sm,
    color: colors.ink,
    fontFamily: fonts.regular,
  },
  inputCerrado: { backgroundColor: "#f2eee5" },
});
