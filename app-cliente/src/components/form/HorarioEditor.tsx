import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
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
  inputMal: { borderColor: colors.danger },
  vacio: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  quitar: { fontSize: 16, color: colors.danger, fontFamily: fonts.bold, paddingHorizontal: 4 },
  agregar: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 4,
  },
  agregarText: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.bold },
});

// ── Sucursales por visita ───────────────────────────────────────────────────
// Uruapan se visita una vez al mes, así que no tiene semana fija: se cargan
// las fechas concretas. Sin fechas no se puede agendar, y eso es correcto.
export function VisitasEditor({
  value,
  onChange,
}: {
  value: { fecha: string; h: string }[];
  onChange: (v: { fecha: string; h: string }[]) => void;
}) {
  function set(i: number, campo: "fecha" | "h", v: string) {
    onChange(value.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Fechas de visita</Text>
      <Text style={styles.helper}>
        Los días concretos en que se atiende aquí. Formato de fecha: 2026-09-20.
      </Text>

      {value.length === 0 ? (
        <Text style={styles.vacio}>
          Sin fechas cargadas. Mientras no haya, nadie puede agendar en esta sucursal.
        </Text>
      ) : null}

      {value.map((v, i) => {
        const fechaMal = v.fecha.trim().length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(v.fecha.trim());
        return (
          <View key={i} style={styles.fila}>
            <TextInput
              style={[styles.input, { flex: 1.1 }, fechaMal && styles.inputMal]}
              value={v.fecha}
              onChangeText={(t) => set(i, "fecha", t)}
              placeholder="2026-09-20"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, { flex: 1.3 }]}
              value={v.h}
              onChangeText={(t) => set(i, "h", t)}
              placeholder="10:00 – 18:00"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
            />
            <Pressable
              onPress={() => onChange(value.filter((_, k) => k !== i))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Quitar fecha"
            >
              <Text style={styles.quitar}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={() => onChange([...value, { fecha: "", h: "10:00 – 18:00" }])}
        style={({ pressed }) => [styles.agregar, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.agregarText}>+ Agregar fecha</Text>
      </Pressable>
    </View>
  );
}
