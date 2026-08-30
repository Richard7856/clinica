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
import { ScreenHeader, Card, EmptyState } from "@/components/ui/Screen";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Panel financiero / KPIs. Solo lectura: resume ventas, actividad y canjes.
// Los datos vienen de getAdminKpis(); se refresca con pull-to-refresh.

// Formatea un monto en pesos MX.
function money(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}

// Versión corta para las etiquetas de la gráfica: "$6,500" no cabe sobre una
// barra de 40 px, "$6.5k" sí.
function moneyShort(n: number): string {
  if (n < 1000) return `$${n}`;
  const miles = n / 1000;
  return `$${miles % 1 === 0 ? miles : miles.toFixed(1)}k`;
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
        <EmptyState
          title="No se pudieron cargar los datos"
          message="Revisa tu conexión y desliza hacia abajo para reintentar."
        />
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
      <ScreenHeader title="Resumen" subtitle="Cómo va tu clínica." />

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
      <Card>
        <View style={styles.chartHead}>
          <Text style={styles.cardTitle}>Ventas por día</Text>
          <Text style={styles.chartTotal}>{money(kpis.salesWeek)} esta semana</Text>
        </View>
        {anySales ? (
          <View>
            <View style={styles.chart}>
              {kpis.salesByDay.map((d, i) => {
                const h = Math.round((d.total / maxDay) * 96);
                const esMax = d.total === maxDay && d.total > 0;
                return (
                  <View key={`${d.label}-${i}`} style={styles.barCol}>
                    <Text style={[styles.barAmount, esMax && styles.barAmountMax]}>
                      {d.total > 0 ? moneyShort(d.total) : ""}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          !esMax && styles.barSoft,
                          { height: Math.max(d.total > 0 ? 3 : 0, h) },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.baseline} />
            <View style={styles.chart}>
              {kpis.salesByDay.map((d, i) => (
                <View key={`lbl-${d.label}-${i}`} style={styles.barCol}>
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.mutedNote}>Sin ventas esta semana.</Text>
        )}
      </Card>

      {/* Tarjeta de actividad */}
      <Card>
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
      </Card>

      {/* Top recompensas */}
      <Card>
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
      </Card>
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

  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    marginBottom: spacing.md,
  },

  // Gráfica de barras
  chartHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  chartTotal: { fontSize: font.size.xs, color: colors.goldDeep, fontFamily: fonts.bold },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  barCol: { flex: 1, alignItems: "center" },
  barAmount: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 5,
    height: 13,
    fontFamily: fonts.semibold,
  },
  barAmountMax: { color: colors.goldDeep, fontFamily: fonts.extrabold },
  barTrack: { height: 96, justifyContent: "flex-end", width: "100%", alignItems: "center" },
  bar: {
    width: "72%",
    maxWidth: 34,
    backgroundColor: colors.gold,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  // Los días sin el máximo van en un dorado más tenue: la barra alta se lee
  // sola, sin necesidad de etiquetar todas.
  barSoft: { backgroundColor: "rgba(201,162,75,0.42)" },
  baseline: { height: 1, backgroundColor: colors.cardLine, marginTop: 2 },
  barLabel: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    textTransform: "capitalize",
    fontFamily: fonts.regular,
  },
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
});
