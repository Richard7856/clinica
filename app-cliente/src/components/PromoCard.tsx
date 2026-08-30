import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Promotion } from "@/lib/types";

// Tarjeta de promoción. `rail` es la versión angosta del carrusel de Inicio;
// `full` la de ancho completo del listado. Alternamos rosa/arena por índice
// para que un carrusel sin fotos no se vea como una sola mancha de color.
export function PromoCard({
  promo,
  variant = "full",
  index = 0,
}: {
  promo: Promotion;
  variant?: "rail" | "full";
  index?: number;
}) {
  const arena = index % 2 === 1;
  return (
    <View
      style={[
        styles.card,
        variant === "rail" ? styles.rail : styles.full,
        arena && styles.arena,
      ]}
    >
      {promo.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{promo.badge}</Text>
        </View>
      ) : null}
      <Text
        style={styles.title}
        numberOfLines={variant === "rail" ? 2 : undefined}
      >
        {promo.title}
      </Text>
      {promo.description ? (
        <Text
          style={styles.desc}
          numberOfLines={variant === "rail" ? 2 : undefined}
        >
          {promo.description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  arena: { backgroundColor: "#e3d9c6" },
  rail: { width: 224 },
  full: { marginBottom: spacing.md },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(122,74,64,0.16)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.extrabold,
    color: "#7a4a40",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: font.size.lg,
    fontFamily: fonts.semibold,
    color: "#4a2f28",
    lineHeight: 21,
  },
  desc: {
    fontSize: font.size.sm,
    fontFamily: fonts.regular,
    color: "#6b5049",
    marginTop: 3,
    lineHeight: 18,
  },
});
