import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { listAppointments } from "@/lib/admin";
import { db } from "@/lib/firebase";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Appointment } from "@/lib/types";

// Panel admin: agenda de la clínica (solo vista, demo).
// Resuelve nombres de paciente/tratamiento/cabina con mapas cargados una vez.

// Etiquetas en español de cada estado.
const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitada",
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

// Color del badge por estado.
const STATUS_COLOR: Record<string, string> = {
  requested: "#7a6cb0",
  scheduled: "#5b7fb0",
  confirmed: colors.ok,
  in_progress: colors.gold,
  completed: colors.muted,
  no_show: colors.danger,
  cancelled: colors.muted,
};

type Filter = "all" | "today";
type NameMap = Record<string, string>;

// Lee una colección y arma un mapa id → campo indicado.
async function loadNameMap(name: string, field: string): Promise<NameMap> {
  const snap = await getDocs(collection(db, name));
  const map: NameMap = {};
  snap.docs.forEach((d) => {
    const v = (d.data() as Record<string, unknown>)[field];
    if (typeof v === "string") map[d.id] = v;
  });
  return map;
}

// ¿La fecha ISO cae en el día local de hoy? (comparación local, no UTC).
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function AppointmentsAdminScreen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<NameMap>({});
  const [treatments, setTreatments] = useState<NameMap>({});
  const [cabins, setCabins] = useState<NameMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Citas + mapas de nombres en paralelo.
      const [appts, pMap, tMap, cMap] = await Promise.all([
        listAppointments(),
        loadNameMap("patients", "fullName"),
        loadNameMap("treatments", "name"),
        loadNameMap("cabins", "name"),
      ]);
      setItems(appts);
      setPatients(pMap);
      setTreatments(tMap);
      setCabins(cMap);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible =
    filter === "today" ? items.filter((a) => isToday(a.startAt)) : items;

  function renderItem({ item }: { item: Appointment }) {
    const when = new Date(item.startAt).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const status = item.status;
    const label = STATUS_LABEL[status] ?? status;
    const color = STATUS_COLOR[status] ?? colors.muted;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.when}>{when}</Text>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{label}</Text>
            </View>
          </View>
          <Text style={styles.patient}>{patients[item.patientId] ?? "—"}</Text>
          <Text style={styles.meta}>
            {treatments[item.treatmentId] ?? "—"} · {cabins[item.cabinId] ?? "—"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={visible}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Citas</Text>
              <Text style={styles.subtitle}>Agenda de la clínica.</Text>
            </View>
            <View style={styles.filters}>
              {(["today", "all"] as const).map((f) => {
                const active = filter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {f === "today" ? "Hoy" : "Todas"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>Sin citas.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: font.size.display - 8, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  filters: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: {
    backgroundColor: "#efeae0",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
  },
  filterChipActive: { backgroundColor: colors.ground },
  filterText: { fontSize: font.size.sm, fontFamily: fonts.bold, color: colors.subtleOnCard },
  filterTextActive: { color: colors.goldSoft },
  card: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  when: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.semibold },
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: "#fff" },
  patient: {
    fontSize: font.size.md,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    marginTop: 6,
  },
  meta: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
