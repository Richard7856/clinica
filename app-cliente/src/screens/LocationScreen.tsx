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
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { ClinicInfo, Clinic } from "@/lib/types";

// Horarios de respaldo si settings/clinic aún no los tiene.
const HOURS_FALLBACK: { dia: string; h: string }[] = [
  { dia: "Lunes", h: "10:00 – 19:00" },
  { dia: "Martes", h: "10:00 – 19:00" },
  { dia: "Miércoles", h: "09:00 – 18:00" },
  { dia: "Jueves", h: "10:00 – 19:00" },
  { dia: "Viernes", h: "09:00 – 18:00" },
  { dia: "Sábado", h: "09:00 – 13:00" },
  { dia: "Domingo", h: "Cerrado" },
];

export function LocationScreen() {
  const [info, setInfo] = useState<ClinicInfo | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hours, setHours] = useState(HOURS_FALLBACK);
  const [priceNote, setPriceNote] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [snap, clinicSnap] = await Promise.all([
          getDoc(doc(db, "settings", "clinic")),
          getDocs(collection(db, "clinics")),
        ]);
        if (!active) return;

        if (snap.exists()) {
          const d = snap.data();
          setInfo({
            name: (d.name as string) ?? "",
            address: d.address as string | undefined,
            phone: d.phone as string | undefined,
          });
          if (Array.isArray(d.horarios) && d.horarios.length > 0) {
            setHours(d.horarios as { dia: string; h: string }[]);
          }
          if (d.priceNote) setPriceNote(d.priceNote as string);
        }

        setClinics(
          clinicSnap.docs
            .map((c) => {
              const x = c.data();
              return {
                id: c.id,
                name: (x.name as string) ?? "",
                address: x.address as string | undefined,
                phone: x.phone as string | undefined,
                active: x.active !== false,
              };
            })
            .filter((c) => c.active),
        );
      } catch {
        if (active) setClinics([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const name = info?.name || "L'Ecrobelle";

  function openMaps(address?: string) {
    if (!address) return;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>
          {clinics.length > 1 ? "Nuestras sucursales." : "Encuéntranos y visítanos."}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {clinics.length === 0 ? (
            <Text style={styles.empty}>Sucursales no disponibles.</Text>
          ) : (
            clinics.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.clinicName}>{c.name}</Text>
                {c.address ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.infoText}>{c.address}</Text>
                  </View>
                ) : null}
                {c.phone ? (
                  <Pressable
                    style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
                    onPress={() => Linking.openURL(`tel:${c.phone!.replace(/\s+/g, "")}`)}
                  >
                    <Text style={styles.icon}>📞</Text>
                    <Text style={[styles.infoText, styles.phone]}>{c.phone}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => openMaps(c.address)}
                >
                  <Text style={styles.mapBtnText}>Ver en el mapa</Text>
                </Pressable>
              </View>
            ))
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Horarios</Text>
            {hours.map((h) => (
              <View key={h.dia} style={styles.hoursRow}>
                <Text style={styles.day}>{h.dia}</Text>
                <Text style={styles.hours}>{h.h}</Text>
              </View>
            ))}
          </View>

          {priceNote ? <Text style={styles.note}>{priceNote}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: {
    fontSize: font.size.display - 8,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: font.size.md, color: colors.muted, marginTop: spacing.xs, fontFamily: fonts.regular },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  clinicName: {
    fontSize: font.size.xl,
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: { fontSize: font.size.lg, fontFamily: fonts.regular },
  infoText: { flex: 1, fontSize: font.size.md, color: colors.textOnCard, fontFamily: fonts.regular },
  phone: { color: colors.goldDeep, fontFamily: fonts.bold },
  mapBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  mapBtnText: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: font.size.sm },
  sectionTitle: {
    fontSize: font.size.lg,
    fontFamily: fonts.regular,
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  day: { fontSize: font.size.md, color: colors.muted, fontFamily: fonts.regular },
  hours: { fontSize: font.size.md, color: colors.ink, fontFamily: fonts.bold },
  empty: { color: colors.muted, fontSize: font.size.md, textAlign: "center", fontFamily: fonts.regular },
  note: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: spacing.xs, fontFamily: fonts.regular },
});
