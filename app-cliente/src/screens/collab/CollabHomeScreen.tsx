import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, spacing, radius, font, fonts } from "@/theme";
import { Swan } from "@/components/Swan";
import { useAuth } from "@/lib/auth";

// Bienvenida del colaborador. La navegación al escáner es por tabs; aquí solo
// damos contexto y los pasos del flujo de asignación de Cisnes.

interface Step {
  n: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    n: "1",
    title: "Escanea el QR",
    text: "Pide al cliente el QR de su cita y escanéalo desde la pestaña Escanear.",
  },
  {
    n: "2",
    title: "Captura el monto gastado",
    text: "Escribe cuánto gastó el cliente en su visita.",
  },
  {
    n: "3",
    title: "Se asignan los Cisnes",
    text: "El sistema calcula y suma los Cisnes a la cuenta del cliente.",
  },
];

export function CollabHomeScreen() {
  const { staff } = useAuth();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Swan size={56} color={colors.ink} />
        <Text style={styles.greeting}>
          Hola, {staff?.fullName ?? "colaborador"}
        </Text>
        <Text style={styles.lead}>
          Escanea el QR de la cita del cliente para asignarle sus Cisnes.
        </Text>
      </View>

      <View style={styles.reminder}>
        <Text style={styles.reminderText}>
          Los puntos solo se asignan al escanear aquí.
        </Text>
      </View>

      <Text style={styles.stepsHeading}>Cómo funciona</Text>
      {STEPS.map((s) => (
        <View key={s.n} style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{s.n}</Text>
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepText}>{s.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  hero: { alignItems: "center", gap: spacing.sm },
  greeting: {
    fontSize: font.size.display - 12,
    fontFamily: fonts.display,
    color: colors.ink,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  lead: {
    fontSize: font.size.md,
    color: colors.subtleOnCard,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md, fontFamily: fonts.regular },
  reminder: {
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  reminderText: {
    color: colors.goldSoft,
    fontSize: font.size.sm,
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  stepsHeading: {
    fontSize: font.size.lg,
    fontFamily: fonts.medium,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#231b06",
    fontFamily: fonts.extrabold,
    fontSize: font.size.md,
  },
  stepBody: { flex: 1 },
  stepTitle: {
    fontSize: font.size.md,
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
  },
  stepText: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 2,
    lineHeight: 18, fontFamily: fonts.regular },
});
