import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Option } from "./Select";

// Selección múltiple por chips. Es el hermano de Select: mismo aspecto y misma
// etiqueta, pero acepta varias opciones a la vez.
export function MultiSelect({
  label,
  options,
  values,
  onChange,
  error,
  helper,
  required = false,
  empty,
}: {
  label: string;
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  error?: string;
  helper?: string;
  required?: boolean;
  empty?: string;
}) {
  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((x) => x !== id) : [...values, id]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>

      {options.length === 0 ? (
        <Text style={styles.helper}>{empty ?? "Sin opciones disponibles."}</Text>
      ) : (
        <View style={styles.chips}>
          {options.map((o) => {
            const on = values.includes(o.value);
            return (
              <Pressable
                key={o.value}
                onPress={() => toggle(o.value)}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipOn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: fonts.bold,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  req: { color: colors.goldDeep },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: colors.ground, borderColor: colors.ground },
  chipText: { fontSize: font.size.sm, color: colors.textOnCard, fontFamily: fonts.medium },
  chipTextOn: { color: colors.goldSoft, fontFamily: fonts.bold },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.semibold },
  helper: { color: colors.subtleOnCard, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.regular },
});
