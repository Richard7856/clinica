import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { colors, spacing, radius, font } from "@/theme";
import type { ClinicInfo } from "@/lib/types";

// Horarios fijos por ahora.
// TODO: mover horarios a settings/clinic en Firestore.
const HOURS: { day: string; hours: string }[] = [
  { day: "Lunes a Viernes", hours: "10:00 – 21:30" },
  { day: "Sábado", hours: "8:00 – 18:00" },
  { day: "Domingo", hours: "Cerrado" },
];

export function LocationScreen() {
  const [info, setInfo] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "clinic"));
        if (active && snap.exists()) {
          const d = snap.data();
          setInfo({
            name: (d.name as string) ?? "",
            address: d.address as string | undefined,
            phone: d.phone as string | undefined,
            pointsLabel: d.pointsLabel as string | undefined,
          });
        }
      } catch {
        if (active) setInfo(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const name = info?.name || "L'Ecrobelle";

  function callPhone() {
    if (info?.phone) {
      Linking.openURL(`tel:${info.phone.replace(/\s+/g, "")}`);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>Encuéntranos y visítanos.</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.gold}
          style={{ marginTop: spacing.xl }}
        />
      ) : (
        <>
          {/* Mapa placeholder — TODO: react-native-maps con coordenadas reales */}
          <View style={styles.map}>
            <View style={styles.pin} />
          </View>

          <View style={styles.card}>
            {info?.address ? (
              <View style={styles.infoRow}>
                <Text style={styles.icon}>📍</Text>
                <Text style={styles.infoText}>{info.address}</Text>
              </View>
            ) : null}

            {info?.phone ? (
              <Pressable
                style={({ pressed }) => [
                  styles.infoRow,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={callPhone}
              >
                <Text style={styles.icon}>📞</Text>
                <Text style={[styles.infoText, styles.phone]}>{info.phone}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Horarios</Text>
            {HOURS.map((h) => (
              <View key={h.day} style={styles.hoursRow}>
                <Text style={styles.day}>{h.day}</Text>
                <Text style={styles.hours}>{h.hours}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: font.size.display - 8,
    fontWeight: "300",
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  map: {
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.goldSoft,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: font.size.lg,
  },
  infoText: {
    flex: 1,
    fontSize: font.size.md,
    color: colors.textOnCard,
  },
  phone: {
    color: colors.goldDeep,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: font.size.lg,
    fontWeight: "400",
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  day: {
    fontSize: font.size.md,
    color: colors.muted,
  },
  hours: {
    fontSize: font.size.md,
    color: colors.ink,
    fontWeight: "700",
  },
});
