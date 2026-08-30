import React from "react";
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenHeader } from "@/components/ui/Screen";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { HomeStackParams } from "@/navigation/Tabs";

type Props = NativeStackScreenProps<HomeStackParams, "MiQr">;

// El QR de la cita, en grande. Es la pantalla que la clienta abre al llegar a
// la clínica, así que aquí no compite con nada: fondo blanco, código enorme y
// zona de silencio amplia para que el escáner enganche a la primera.
export function QrScreen({ route, navigation }: Props) {
  const { appointmentId, titulo, cuando, sucursal } = route.params;
  const { width } = useWindowDimensions();

  // Zona de silencio: el QR nunca toca los bordes de su tarjeta blanca.
  const qrSize = Math.min(width - spacing.lg * 2 - spacing.xl * 2, 300);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Mi código QR" compact onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.treatment}>{titulo}</Text>
        <Text style={styles.when}>
          {cuando}
          {sucursal ? ` · ${sucursal}` : ""}
        </Text>

        <View style={styles.qrCard}>
          <QRCode
            value={appointmentId}
            size={qrSize}
            backgroundColor="#ffffff"
            color={colors.ground}
          />
        </View>

        <View style={styles.note}>
          <Swan size={22} color={colors.goldDeep} />
          <Text style={styles.noteText}>
            Muestra este código en recepción. Al escanearlo se acreditan tus
            Cisnes automáticamente.
          </Text>
        </View>

        <Text style={styles.tip}>
          ¿No lo lee? Sube el brillo de tu pantalla al máximo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  treatment: {
    fontSize: font.size.xl + 4,
    fontFamily: fonts.displayRegular,
    color: colors.ink,
    textAlign: "center",
    lineHeight: 30,
  },
  when: {
    fontSize: font.size.md,
    fontFamily: fonts.medium,
    color: colors.subtleOnCard,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  qrCard: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardLine,
    shadowColor: "#2b2118",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(201,162,75,0.10)",
    borderWidth: 1,
    borderColor: "rgba(201,162,75,0.30)",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  noteText: {
    flex: 1,
    fontSize: font.size.sm,
    fontFamily: fonts.regular,
    color: "#5c4a1f",
    lineHeight: 19,
  },
  tip: {
    fontSize: font.size.xs,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
