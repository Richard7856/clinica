import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenHeader } from "@/components/ui/Screen";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { AjustesStackParams } from "@/navigation/AdminTabs";

type Props = NativeStackScreenProps<AjustesStackParams, "AjustesMenu">;

// Menú del tab Ajustes: navega a las pantallas de configuración del admin.
export function AjustesMenuScreen({ navigation }: Props) {
  const items: { key: keyof AjustesStackParams; label: string; desc: string }[] = [
    { key: "Tratamientos", label: "Tratamientos", desc: "Catálogo, precios y sucursales" },
    { key: "Usuarios", label: "Usuarios", desc: "Restringir acceso y habilitar tienda" },
    { key: "Aparatos", label: "Aparatos", desc: "Equipos, clínica y horarios" },
    { key: "Recompensas", label: "Recompensas", desc: "Catálogo canjeable por Cisnes" },
    { key: "Clinicas", label: "Clínicas", desc: "Tus sucursales" },
    { key: "ConfigPuntos", label: "Configuración de puntos", desc: "Cuántos Cisnes por gasto" },
  ];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader title="Ajustes" subtitle="Configuración de la clínica." />
      {items.map((it) => (
        <Pressable
          key={it.key}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate(it.key)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{it.label}</Text>
            <Text style={styles.rowDesc}>{it.desc}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowLabel: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  rowDesc: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  chevron: { fontSize: 28, color: colors.muted, marginLeft: spacing.md, fontFamily: fonts.regular },
});
