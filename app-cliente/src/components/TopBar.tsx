import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swan } from "./Swan";
import { CisneBadge } from "./CisneBadge";
import { colors, spacing } from "@/theme";

// Barra superior de marca, compartida por todas las pantallas autenticadas.
export function TopBar({ points }: { points: number }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Swan size={22} color={colors.cream} />
          <Text style={styles.name}>L'ECROBELLE</Text>
        </View>
        <CisneBadge points={points} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.ground },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: {
    color: colors.cream,
    fontWeight: "200",
    letterSpacing: 3,
    fontSize: 12,
  },
});
