import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { getAdminKpis, type AdminKpis, type KpiPeriodo } from "@/lib/admin";
import { ScreenHeader, Card, SectionLabel, EmptyState, Loader } from "@/components/ui/Screen";
import { Segmented, type SegmentedOption } from "@/components/ui/Controls";
import { ColumnChart, RankedBars, Meter } from "@/components/ui/Charts";
import { Swan } from "@/components/Swan";
import { colors, spacing, font, fonts } from "@/theme";

// Panel de la clínica. Solo lectura, con un periodo que manda sobre todo lo
// que se muestra abajo. Cada bloque responde una pregunta del dueño, en orden:
// cuánto entró, qué hay hoy, de dónde viene el dinero y cuánto se debe en Cisnes.

const PERIODOS: SegmentedOption<KpiPeriodo>[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "7 días" },
  { value: "mes", label: "30 días" },
];

function money(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}

// Sobre una columna de ~40 px no cabe "$6,500"; sí cabe "$6.5k".
function moneyShort(n: number): string {
  if (n < 1000) return `$${n}`;
  const miles = n / 1000;
  return `$${miles % 1 === 0 ? miles : miles.toFixed(1)}k`;
}

export function KpiDashboardScreen() {
  const [periodo, setPeriodo] = useState<KpiPeriodo>("mes");
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: KpiPeriodo) => {
    try {
      setKpis(await getAdminKpis(p));
    } catch {
      setKpis(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      await load(periodo);
      if (vivo) setLoading(false);
    })();
    return () => {
      vivo = false;
    };
  }, [load, periodo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(periodo);
    setRefreshing(false);
  }, [load, periodo]);

  // Variación contra el lapso inmediatamente anterior. Sin base previa no se
  // inventa un porcentaje: "sin comparación" es la respuesta honesta.
  const previo = kpis?.ingresosPrevio ?? 0;
  const delta =
    kpis && previo > 0 ? Math.round(((kpis.ingresos - previo) / previo) * 100) : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
    >
      <ScreenHeader title="Resumen" subtitle="Cómo va tu clínica." />
      <Segmented options={PERIODOS} value={periodo} onChange={setPeriodo} />

      {loading ? (
        <Loader />
      ) : !kpis ? (
        <EmptyState
          title="No se pudieron cargar los datos"
          message="Revisa tu conexión y desliza hacia abajo para reintentar."
        />
      ) : (
        <>
          {/* ── Cuánto entró ── */}
          <Card style={styles.hero}>
            <Text style={styles.heroLabel}>INGRESOS · {kpis.periodoLabel.toUpperCase()}</Text>
            <Text style={styles.heroValue}>{money(kpis.ingresos)}</Text>
            {delta !== null ? (
              <Text
                style={[
                  styles.heroDelta,
                  { color: delta >= 0 ? colors.ok : colors.danger },
                ]}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs. el lapso anterior
              </Text>
            ) : (
              <Text style={styles.heroDeltaMuted}>Sin lapso anterior para comparar</Text>
            )}
            <View style={styles.heroFoot}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{kpis.cobros}</Text>
                <Text style={styles.heroStatLabel}>cobros</Text>
              </View>
              <View style={styles.heroDiv} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{money(kpis.ticketPromedio)}</Text>
                <Text style={styles.heroStatLabel}>ticket promedio</Text>
              </View>
              <View style={styles.heroDiv} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{kpis.nuevosClientes}</Text>
                <Text style={styles.heroStatLabel}>clientes nuevos</Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={styles.cardTitleTight}>{kpis.serieTitulo}</Text>
            <Text style={styles.cardCaption}>{kpis.serieVentana}</Text>
            <ColumnChart data={kpis.serie} format={moneyShort} />
          </Card>

          {/* ── Qué hay hoy ── */}
          <SectionLabel>Agenda de hoy</SectionLabel>
          <Card>
            <View style={styles.agenda}>
              <View style={styles.agendaStat}>
                <Text style={styles.agendaNum}>{kpis.hoyTotal}</Text>
                <Text style={styles.agendaLbl}>citas hoy</Text>
              </View>
              <View style={styles.agendaStat}>
                <Text style={styles.agendaNum}>{kpis.hoyAtendidas}</Text>
                <Text style={styles.agendaLbl}>ya atendidas</Text>
              </View>
              <View style={styles.agendaStat}>
                <Text style={styles.agendaNum}>{kpis.hoyTotal - kpis.hoyAtendidas}</Text>
                <Text style={styles.agendaLbl}>por atender</Text>
              </View>
            </View>

            {kpis.proximas.length > 0 ? (
              <View style={styles.proximas}>
                {kpis.proximas.map((p, i) => (
                  <View key={`${p.hora}-${i}`} style={styles.proxRow}>
                    <Text style={styles.proxHora}>{p.hora}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.proxNombre} numberOfLines={1}>
                        {p.paciente}
                      </Text>
                      <Text style={styles.proxTrat} numberOfLines={1}>
                        {p.tratamiento}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.nota}>
                {kpis.hoyTotal === 0
                  ? "No hay citas agendadas para hoy."
                  : kpis.hoyAtendidas === kpis.hoyTotal
                    ? "Todas las citas de hoy quedaron atendidas."
                    : "Ya pasó la hora de las citas que faltan por atender."}
              </Text>
            )}

            {kpis.porConfirmar > 0 ? (
              <View style={styles.aviso}>
                <Text style={styles.avisoText}>
                  {kpis.porConfirmar}{" "}
                  {kpis.porConfirmar === 1
                    ? "solicitud a futuro espera confirmación"
                    : "solicitudes a futuro esperan confirmación"}
                  .
                </Text>
              </View>
            ) : null}
          </Card>

          {/* ── De dónde viene el dinero ── */}
          <SectionLabel>De dónde viene</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>Cómo te pagan</Text>
            {kpis.porMetodo.length > 0 ? (
              <RankedBars
                data={kpis.porMetodo.map((m) => ({ label: m.label, value: m.total }))}
                format={money}
              />
            ) : (
              <Text style={styles.nota}>Sin cobros en {kpis.periodoLabel}.</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Tratamientos más agendados</Text>
            {kpis.topTratamientos.length > 0 ? (
              <RankedBars
                data={kpis.topTratamientos.map((t) => ({ label: t.name, value: t.count }))}
                format={(n) => `${n} ${n === 1 ? "cita" : "citas"}`}
              />
            ) : (
              <Text style={styles.nota}>Sin citas agendadas en {kpis.periodoLabel}.</Text>
            )}
          </Card>

          {/* ── Cuánto debes en Cisnes ── */}
          <SectionLabel>Programa de Cisnes</SectionLabel>
          <Card>
            <View style={styles.cisnesTop}>
              <Swan size={22} color={colors.goldDeep} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cisnesNum}>
                  {(kpis.cisnesEarned - kpis.cisnesRedeemed).toLocaleString("es-MX")}
                </Text>
                <Text style={styles.cisnesLbl}>Cisnes en circulación</Text>
              </View>
            </View>
            <Meter value={kpis.cisnesRedeemed} total={kpis.cisnesEarned} />
            <Text style={styles.nota}>
              {kpis.cisnesRedeemed.toLocaleString("es-MX")} canjeados de{" "}
              {kpis.cisnesEarned.toLocaleString("es-MX")} otorgados. Lo que queda son
              recompensas que tus clientas todavía pueden reclamar.
            </Text>
          </Card>

          {kpis.topRewards.length > 0 ? (
            <Card>
              <Text style={styles.cardTitle}>Recompensas más canjeadas</Text>
              <RankedBars
                data={kpis.topRewards.map((r) => ({ label: r.title, value: r.count }))}
                format={(n) => `${n}`}
              />
            </Card>
          ) : null}

          <Text style={styles.pie}>
            {kpis.totalPatients.toLocaleString("es-MX")} clientas registradas en total.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  hero: { backgroundColor: colors.ground, borderColor: colors.ground, marginTop: spacing.lg },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.goldSoft,
    fontFamily: fonts.bold,
  },
  heroValue: {
    fontSize: 44,
    lineHeight: 52,
    color: colors.cream,
    fontFamily: fonts.display,
    marginTop: 2,
  },
  heroDelta: { fontSize: font.size.sm, fontFamily: fonts.bold },
  heroDeltaMuted: { fontSize: font.size.sm, color: "#8f897d", fontFamily: fonts.regular },
  heroFoot: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  heroStat: { flex: 1 },
  heroDiv: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.12)" },
  heroStatValue: { fontSize: font.size.lg, color: colors.cream, fontFamily: fonts.bold },
  heroStatLabel: { fontSize: 10, color: "#b7b1a5", fontFamily: fonts.regular, marginTop: 1 },

  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    marginBottom: spacing.lg,
  },
  cardTitleTight: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  cardCaption: {
    fontSize: font.size.xs,
    color: colors.muted,
    fontFamily: fonts.regular,
    marginBottom: spacing.lg,
    marginTop: 1,
  },
  aviso: {
    marginTop: spacing.md,
    backgroundColor: "rgba(201,162,75,0.12)",
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  avisoText: { fontSize: font.size.sm, color: "#5c4a1f", fontFamily: fonts.semibold },

  agenda: { flexDirection: "row", gap: spacing.md },
  agendaStat: { flex: 1, alignItems: "center" },
  agendaNum: { fontSize: 30, color: colors.ink, fontFamily: fonts.display, lineHeight: 36 },
  agendaLbl: { fontSize: font.size.xs, color: colors.muted, fontFamily: fonts.regular },
  proximas: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
    gap: spacing.md,
  },
  proxRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  proxHora: {
    fontSize: font.size.sm,
    color: colors.goldDeep,
    fontFamily: fonts.bold,
    width: 62,
  },
  proxNombre: { fontSize: font.size.md, color: colors.textOnCard, fontFamily: fonts.medium },
  proxTrat: { fontSize: font.size.xs, color: colors.muted, fontFamily: fonts.regular },

  cisnesTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  cisnesNum: { fontSize: 30, color: colors.ink, fontFamily: fonts.display, lineHeight: 34 },
  cisnesLbl: { fontSize: font.size.sm, color: colors.muted, fontFamily: fonts.regular },

  nota: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  pie: {
    fontSize: font.size.xs,
    color: colors.muted,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
