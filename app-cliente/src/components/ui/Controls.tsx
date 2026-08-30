import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Controles compartidos de listas y tarjetas del panel.

// Insignia de estado. `tone` pinta el fondo; el texto siempre contrasta.
export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color: tint(color) }]}>{label}</Text>
    </View>
  );
}

// Los colores de estado son claros y sobre fondo tenue pierden contraste;
// los oscurecemos un poco para el texto.
function tint(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return colors.textOnCard;
  const n = parseInt(m[1], 16);
  const dim = (c: number) => Math.round(c * 0.62);
  return `rgb(${dim((n >> 16) & 255)}, ${dim((n >> 8) & 255)}, ${dim(n & 255)})`;
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

// Control segmentado: una sola opción activa, en una fila. Reemplaza a los
// grupos de píldoras apiladas, que comían el ancho de la tarjeta y no se leían
// como un grupo excluyente.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.segment,
              on && styles.segmentOn,
              pressed && !on && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Par de acciones de una tarjeta de lista. Existe para que "Editar" y
// "Eliminar" se vean y se ubiquen igual en todo el panel: antes cada pantalla
// ofrecía acciones distintas y en lugares distintos.
export function RowActions({
  onEdit,
  onDelete,
  editLabel = "Editar",
  deleteLabel = "Eliminar",
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}) {
  if (!onEdit && !onDelete) return null;
  return (
    <View style={styles.actions}>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button">
          <Text style={styles.edit}>{editLabel}</Text>
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button">
          <Text style={styles.delete}>{deleteLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    alignSelf: "flex-start",
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: font.size.xs, fontFamily: fonts.bold, letterSpacing: 0.3 },

  segmented: {
    flexDirection: "row",
    backgroundColor: "#efeae0",
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentOn: { backgroundColor: colors.ground },
  segmentText: { fontSize: font.size.xs, fontFamily: fonts.bold, color: colors.subtleOnCard },
  segmentTextOn: { color: colors.goldSoft },

  actions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
  },
  edit: { color: colors.goldDeep, fontSize: font.size.sm, fontFamily: fonts.bold },
  delete: { color: colors.danger, fontSize: font.size.sm, fontFamily: fonts.bold },
});
