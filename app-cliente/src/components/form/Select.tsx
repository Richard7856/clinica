import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, font } from "@/theme";

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

// Selector por chips: en móvil es más cómodo que un dropdown y deja ver todas
// las opciones. Con `clearable` el mismo toque deselecciona.
export function Select({
  label,
  options,
  value,
  onChange,
  error,
  helper,
  required = false,
  clearable = false,
  empty,
}: {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
  helper?: string;
  required?: boolean;
  clearable?: boolean;
  empty?: string;
}) {
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
            const on = value === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => onChange(on && clearable ? null : o.value)}
                style={[styles.chip, on && styles.chipOn, !!error && !on && styles.chipError]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                {o.hint ? (
                  <Text style={[styles.chipHint, on && styles.chipHintOn]}>{o.hint}</Text>
                ) : null}
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
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  req: { color: colors.goldDeep },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: colors.ground, borderColor: colors.ground },
  chipError: { borderColor: colors.danger },
  chipText: { fontSize: font.size.sm, color: colors.textOnCard, fontWeight: "500" },
  chipTextOn: { color: colors.goldSoft, fontWeight: "700" },
  chipHint: { fontSize: font.size.xs, color: colors.goldDeep, fontWeight: "700", marginTop: 2 },
  chipHintOn: { color: colors.goldSoft },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontWeight: "600" },
  helper: { color: colors.subtleOnCard, fontSize: font.size.xs, marginTop: 4 },
});
