import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font } from "@/theme";
import type { Reward, Promotion } from "@/lib/types";

// Umbral de la "próxima recompensa" — meta visual de la barra de progreso.
// TODO: leer del catálogo de recompensas (la más barata que aún no alcanza).
const NEXT_GOAL = 80;

export function HomeScreen() {
  const { patient, refreshPatient } = useAuth();
  const [activity, setActivity] = useState<Reward[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const points = patient?.points ?? 0;
  const firstName = (patient?.fullName ?? "").trim().split(/\s+/)[0] || "";

  const loadActivity = useCallback(async () => {
    if (!patient) {
      setActivity([]);
      return;
    }
    try {
      // Solo where (sin orderBy/limit) para no requerir índice compuesto.
      const snap = await getDocs(
        query(collection(db, "rewards"), where("patientId", "==", patient.id)),
      );
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Reward, "id">) }))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 5);
      setActivity(rows);
    } catch {
      setActivity([]);
    }
  }, [patient]);

  const loadPromos = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "promotions"), where("active", "==", true)),
      );
      setPromos(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) })),
      );
    } catch {
      setPromos([]);
    }
  }, []);

  useEffect(() => {
    loadActivity();
    loadPromos();
  }, [loadActivity, loadPromos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPatient(), loadActivity(), loadPromos()]);
    setRefreshing(false);
  }, [refreshPatient, loadActivity, loadPromos]);

  const pct = Math.min(100, Math.round((points / NEXT_GOAL) * 100));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
    >
      <Text style={styles.hello}>Hola{firstName ? `, ${firstName}` : ""} 🕊</Text>

      {/* Tarjeta de Cisnes */}
      <View style={styles.hero}>
        <Text style={styles.heroLbl}>TUS CISNES</Text>
        <View style={styles.heroBig}>
          <Swan size={38} color={colors.goldSoft} />
          <Text style={styles.heroNum}>{points}</Text>
        </View>
        <Text style={styles.heroCap}>
          Acumula con cada compra y canjéalos por recompensas
        </Text>
        <View style={styles.progress}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressTxt}>Próxima recompensa</Text>
            <Text style={styles.progressTxt}>
              {points} / {NEXT_GOAL}
            </Text>
          </View>
        </View>
      </View>

      {/* Estado sin ficha ligada */}
      {!patient && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Aún no encontramos tu ficha. Pide en la clínica que registren tu
            correo para ver tus Cisnes e historial.
          </Text>
        </View>
      )}

      {/* Promociones activas (controladas desde el panel admin) */}
      {promos.length > 0 && (
        <>
          <Text style={styles.sectionLbl}>PROMOCIONES</Text>
          {promos.map((p) => (
            <View key={p.id} style={styles.promo}>
              {p.badge ? (
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>{p.badge}</Text>
                </View>
              ) : null}
              <Text style={styles.promoTitle}>{p.title}</Text>
              {p.description ? (
                <Text style={styles.promoDesc}>{p.description}</Text>
              ) : null}
            </View>
          ))}
        </>
      )}

      {/* Actividad reciente */}
      <Text style={styles.sectionLbl}>ACTIVIDAD RECIENTE</Text>
      {activity.length === 0 ? (
        <Text style={styles.empty}>Sin movimientos todavía.</Text>
      ) : (
        activity.map((r) => (
          <View key={r.id} style={styles.actRow}>
            <View style={styles.actDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actReason}>{r.reason}</Text>
              <Text style={styles.actDate}>
                {new Date(r.date).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
            <Text
              style={[
                styles.actPts,
                { color: r.type === "earned" ? colors.goldDeep : colors.danger },
              ]}
            >
              {r.type === "earned" ? "+" : "−"}
              {r.points}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hello: {
    fontSize: font.size.md,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  hero: {
    backgroundColor: colors.ground,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  heroLbl: {
    fontSize: font.size.xs,
    letterSpacing: 2,
    color: colors.goldSoft,
    fontWeight: "600",
  },
  heroBig: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  heroNum: { fontSize: 52, color: colors.cream, fontWeight: "300" },
  heroCap: { fontSize: font.size.sm, color: "#b7b1a5", textAlign: "center" },
  progress: { width: "100%", marginTop: spacing.lg },
  bar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.gold },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  progressTxt: { fontSize: 10.5, color: "#b7b1a5" },
  warn: {
    backgroundColor: "rgba(217,138,122,0.12)",
    borderColor: "rgba(217,138,122,0.35)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  warnText: { color: "#7a4a40", fontSize: font.size.sm, lineHeight: 19 },
  sectionLbl: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "600",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  empty: { color: colors.muted, fontSize: font.size.sm },
  promo: {
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  promoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(122,74,64,0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7a4a40",
    letterSpacing: 0.5,
  },
  promoTitle: { fontSize: font.size.lg, fontWeight: "600", color: "#4a2f28" },
  promoDesc: { fontSize: font.size.sm, color: "#6b5049", marginTop: 3, lineHeight: 18 },
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLine,
  },
  actDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  actReason: { fontSize: font.size.md, color: colors.ink, fontWeight: "500" },
  actDate: { fontSize: font.size.xs, color: colors.muted, marginTop: 2 },
  actPts: { fontSize: font.size.lg, fontWeight: "700" },
});
