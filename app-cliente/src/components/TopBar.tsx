import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Swan } from "./Swan";
import { CisneBadge } from "./CisneBadge";
import { useAuth } from "@/lib/auth";
import { colors, spacing, fonts } from "@/theme";

// Barra superior de marca (cliente): marca + Cisnes + cerrar sesión.
export function TopBar({ points }: { points: number }) {
  const { signOut } = useAuth();
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Swan size={22} color={colors.cream} />
          <Text style={styles.name}>L'ECROBELLE</Text>
        </View>
        <View style={styles.right}>
          <CisneBadge points={points} />
          <Pressable onPress={() => signOut()} hitSlop={10} style={styles.logout}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                fill="none"
                stroke="#cfc9bd"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
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
  name: { color: colors.cream, fontFamily: fonts.display, letterSpacing: 3, fontSize: 12 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logout: { padding: 2 },
});
