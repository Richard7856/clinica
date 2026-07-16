import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Swan } from "./Swan";
import { colors, radius } from "@/theme";

// Badge del saldo de Cisnes que va en la barra superior.
export function CisneBadge({ points }: { points: number }) {
  return (
    <View style={styles.badge}>
      <Swan size={14} color={colors.goldSoft} />
      <Text style={styles.text}>{points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(201,162,75,0.16)",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.45)",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  text: { color: colors.goldSoft, fontSize: 12, fontWeight: "700" },
});
