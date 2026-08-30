import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";

export type ButtonVariant = "primary" | "dark" | "ghost" | "danger";

// Botón de la marca. `loading` bloquea el toque y muestra spinner, para que
// ninguna acción se dispare dos veces.
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        VARIANT[variant].box,
        off && styles.off,
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
    >
      <View style={styles.inner}>
        {loading && (
          <ActivityIndicator size="small" color={VARIANT[variant].text.color} />
        )}
        <Text style={[styles.label, VARIANT[variant].text]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const VARIANT: Record<ButtonVariant, { box: ViewStyle; text: { color: string } }> = {
  primary: { box: { backgroundColor: colors.gold }, text: { color: "#231b06" } },
  dark: { box: { backgroundColor: colors.ground }, text: { color: colors.goldSoft } },
  ghost: {
    box: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.cardLine },
    text: { color: colors.textOnCard },
  },
  danger: { box: { backgroundColor: colors.danger }, text: { color: "#fff" } },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: font.size.md, letterSpacing: 0.3 },
  off: { opacity: 0.45 },
});
