import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, spacing, font, fonts } from "@/theme";

// Encabezado de las pantallas internas del cliente. No usamos el header del
// native-stack para no apilar dos barras debajo del TopBar de marca.
export function BackHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke={colors.ink}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { padding: 2 },
  title: {
    flex: 1,
    fontSize: font.size.xl,
    fontFamily: fonts.displayRegular,
    color: colors.ink,
  },
});
