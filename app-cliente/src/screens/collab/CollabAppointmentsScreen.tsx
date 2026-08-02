import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "@/theme";
import { listTodayVisits } from "@/lib/collaborator";
import type { TodayVisit } from "@/lib/collaborator";
import type { CitasStackParams } from "@/navigation/CollaboratorTabs";

// Panel colaborador: lista las citas de hoy. Al tocar una cita se abre el
// detalle para validar el QR del cliente y asignar sus Cisnes.

type Props = NativeStackScreenProps<CitasStackParams, "CitasList">;

// Formatea la hora de la cita a hh:mm (es-MX).
function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function CollabAppointmentsScreen({ navigation }: Props) {
  const [visits, setVisits] = useState<TodayVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Carga las citas del día. `initial` distingue la primera carga (spinner
  // central) del pull-to-refresh (spinner en el RefreshControl).
  const load = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      setVisits(await listTodayVisits());
    } catch {
      setVisits([]);
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  // Recarga al enfocar la pantalla (también al volver del detalle).
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const renderItem = useCallback(
    ({ item }: { item: TodayVisit }) => (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("VisitDetail", { visit: item })}
      >
        <View style={styles.timeCol}>
          <Text style={styles.time}>{formatTime(item.startAt)}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.name}>{item.patientName}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.treatmentName}
            {item.clinicName ? ` · ${item.clinicName}` : ""}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            item.pointsAwarded ? styles.badgeDone : styles.badgePending,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              item.pointsAwarded ? styles.badgeTextDone : styles.badgeTextPending,
            ]}
          >
            {item.pointsAwarded ? "Atendida" : "Pendiente"}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={visits}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(false)}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Citas de hoy</Text>
            <Text style={styles.subtitle}>
              Selecciona una cita para atenderla.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>No hay citas para hoy.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: {
    fontSize: font.size.display - 8,
    fontWeight: "300",
    color: colors.ink,
  },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2 },

  card: {
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
  timeCol: { minWidth: 52 },
  time: { fontSize: font.size.md, fontWeight: "700", color: colors.goldDeep },
  infoCol: { flex: 1 },
  name: { fontSize: font.size.lg, color: colors.textOnCard, fontWeight: "500" },
  meta: { fontSize: font.size.sm, color: colors.subtleOnCard, marginTop: 2 },

  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  badgeDone: { backgroundColor: "#e4f0e8" },
  badgePending: { backgroundColor: "#f3e7c8" },
  badgeText: { fontSize: font.size.xs, fontWeight: "800" },
  badgeTextDone: { color: colors.ok },
  badgeTextPending: { color: colors.goldDeep },

  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
