import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getAdminKpis, type AdminKpis } from "@/lib/admin";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Panel financiero / KPIs. Solo lectura: resume ventas, actividad y canjes.
// Los datos vienen de getAdminKpis(); se refresca con pull-to-refresh.

// Formatea un monto en pesos MX.
function money(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}

export function KpiDashboardScreen() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      setKpis(await getAdminKpis());
    } catch {
      setKpis(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Estado de carga inicial.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  // Sin datos (fallo de red o vacío).
  if (!kpis) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No se pudieron cargar los datos.</Text>
      </View>
    );
  }

  // Máximos para escalar las barras.
  const maxDay = Math.max(1, ...kpis.salesByDay.map((d) => d.total));
  const anySales = kpis.salesByDay.some((d) => d.total > 0);
  const maxReward = Math.max(1, ...kpis.topRewards.map((r) => r.count));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold}
        />
      }
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>Resumen</Text>
        <Text style={styles.subtitle}>Cómo va tu clínica.</Text>
      </View>

      {/* Fila de tarjetas KPI (grid 2 columnas) */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Ventas totales</Text>
          <Text style={styles.kpiValue}>{money(kpis.totalSales)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Ventas hoy</Text>
          <Text style={styles.kpiValue}>{money(kpis.salesToday)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Esta semana</Text>
          <Text style={styles.kpiValue}>{money(kpis.salesWeek)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Clientes</Text>
          <Text style={styles.kpiValue}>
            {kpis.totalPatients.toLocaleString("es-MX")}
          </Text>
        </View>
      </View>

      {/* Gráfica de ventas por día (últimos 7 días) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ventas por día</Text>
        {anySales ? (
          <View style={styles.chart}>
            {kpis.salesByDay.map((d, i) => {
              const h = Math.round((d.total / maxDay) * 90);
              return (
                <View key={`${d.label}-${i}`} style={styles.barCol}>
                  <Text style={styles.barAmount}>
                    {d.total > 0 ? money(d.total) : ""}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(d.total > 0 ? 4 : 0, h) },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.mutedNote}>Sin ventas esta semana</Text>
        )}
      </View>

      {/* Tarjeta de actividad */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actividad</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Visitas atendidas</Text>
          <Text style={styles.statValue}>
            {kpis.visits.toLocaleString("es-MX")}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Citas por atender</Text>
          <Text style={styles.statValue}>
            {kpis.requested.toLocaleString("es-MX")}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Cisnes otorgados</Text>
          <Text style={styles.statValue}>
            {kpis.cisnesEarned.toLocaleString("es-MX")}
          </Text>
        </View>
        <View style={[styles.statRow, styles.statRowLast]}>
          <Text style={styles.statLabel}>Cisnes canjeados</Text>
          <Text style={styles.statValue}>
            {kpis.cisnesRedeemed.toLocaleString("es-MX")}
          </Text>
        </View>
      </View>

      {/* Top recompensas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recompensas más canjeadas</Text>
        {kpis.topRewards.length > 0 ? (
          <View style={styles.rewardList}>
            {kpis.topRewards.map((r, i) => (
              <View key={`${r.title}-${i}`} style={styles.rewardRow}>
                <View style={styles.rewardHead}>
                  <Text style={styles.rewardTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={styles.rewardCount}>
                    {r.count.toLocaleString("es-MX")}
                  </Text>
                </View>
                <View style={styles.rewardTrack}>
                  <View
                    style={[
                      styles.rewardBar,
                      { width: `${Math.round((r.count / maxReward) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedNote}>Aún no hay canjes.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: font.size.display - 8, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },

  // Grid de KPIs
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  kpiLabel: {
    fontSize: font.size.xs,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    marginTop: spacing.sm,
  },

  // Tarjeta genérica
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    marginBottom: spacing.md,
  },

  // Gráfica de barras
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  barCol: { flex: 1, alignItems: "center" },
  barAmount: {
    fontSize: 9,
    color: colors.subtleOnCard,
    marginBottom: 4,
    height: 12, fontFamily: fonts.regular },
  barTrack: { height: 90, justifyContent: "flex-end" },
  bar: {
    width: 18,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
  },
  barLabel: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    textTransform: "capitalize", fontFamily: fonts.regular },
  mutedNote: {
    fontSize: font.size.sm,
    color: colors.muted,
    paddingVertical: spacing.sm, fontFamily: fonts.regular },

  // Filas de actividad
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLine,
  },
  statRowLast: { borderBottomWidth: 0 },
  statLabel: { fontSize: font.size.md, color: colors.subtleOnCard, fontFamily: fonts.regular },
  statValue: { fontSize: font.size.md, color: colors.ink, fontFamily: fonts.bold },

  // Top recompensas
  rewardList: { gap: spacing.md },
  rewardRow: {},
  rewardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rewardTitle: {
    fontSize: font.size.md,
    color: colors.textOnCard,
    flexShrink: 1,
    marginRight: spacing.sm, fontFamily: fonts.regular },
  rewardCount: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.bold },
  rewardTrack: {
    height: 8,
    backgroundColor: colors.cardLine,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  rewardBar: {
    height: 8,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
  },
  empty: { fontSize: font.size.md, color: colors.muted, fontFamily: fonts.regular },
});
