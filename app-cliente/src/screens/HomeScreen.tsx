import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Swan } from "@/components/Swan";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { PromoCard } from "@/components/PromoCard";
import { listMyAppointments, pickNextAppointment } from "@/lib/appointments";
import { listActivePromotions, listClinics, listTreatments, nombrePorId } from "@/lib/catalog";
import { etiquetaDia, etiquetaHora } from "@/lib/schedule";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Appointment, Promotion, Reward, RewardItem } from "@/lib/types";
import type { HomeStackParams } from "@/navigation/Tabs";

type Props = NativeStackScreenProps<HomeStackParams, "Inicio">;

const PROMOS_EN_INICIO = 5;
// Con más de dos promos el carrusel ya deja las demás fuera de vista: ahí es
// cuando ofrecer el listado completo aporta algo.
const PROMOS_VER_TODAS = 2;

// Inicio del cliente. La jerarquía es deliberada: lo primero es "qué sigue
// para mí" (la próxima cita y su QR), después agendar, y hasta abajo lo que se
// consulta de vez en cuando. Los Cisnes viven en una franja compacta porque se
// miran, no se accionan.
export function HomeScreen({ navigation }: Props) {
  const { patient, refreshPatient } = useAuth();

  const [next, setNext] = useState<Appointment | null>(null);
  const [treatmentNames, setTreatmentNames] = useState<Record<string, string>>({});
  const [clinicNames, setClinicNames] = useState<Record<string, string>>({});
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [activity, setActivity] = useState<Reward[]>([]);
  const [rewardCosts, setRewardCosts] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const points = patient?.points ?? 0;
  const firstName = (patient?.fullName ?? "").trim().split(/\s+/)[0] || "";

  // Cambiar de tab (Cita, Recompensas…) desde una pantalla del stack de Inicio.
  const irATab = useCallback(
    (name: string) => navigation.getParent()?.navigate(name as never),
    [navigation],
  );

  const load = useCallback(async () => {
    try {
      const [appts, treats, clinics, proms, catalogo, movs] = await Promise.all([
        patient ? listMyAppointments(patient.id) : Promise.resolve([]),
        listTreatments(),
        listClinics(),
        listActivePromotions(),
        getDocs(query(collection(db, "rewardItems"), where("active", "==", true))),
        patient
          ? getDocs(query(collection(db, "rewards"), where("patientId", "==", patient.id)))
          : Promise.resolve(null),
      ]);

      setNext(pickNextAppointment(appts));
      setTreatmentNames(nombrePorId(treats));
      setClinicNames(nombrePorId(clinics));
      setPromos(proms);
      setRewardCosts(
        catalogo.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RewardItem, "id">) })),
      );
      setActivity(
        movs
          ? movs.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Reward, "id">) }))
              .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
              .slice(0, 5)
          : [],
      );
    } catch {
      // Sin conexión o sin permisos: la pantalla se degrada a sus estados vacíos.
      setNext(null);
      setPromos([]);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  // Al volver de agendar, la tarjeta de "próxima cita" tiene que reflejar la
  // cita recién pedida: recargamos cada vez que el tab recupera el foco, no
  // solo al montar.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPatient(), load()]);
    setRefreshing(false);
  }, [refreshPatient, load]);

  // La meta es la recompensa más barata que todavía no alcanza. Si ya alcanza
  // todas (o no hay catálogo), no mostramos barra: no hay nada que perseguir.
  const meta = useMemo(() => {
    const pendientes = rewardCosts
      .filter((r) => r.cost > points)
      .sort((a, b) => a.cost - b.cost);
    return pendientes[0] ?? null;
  }, [rewardCosts, points]);

  const pct = meta ? Math.min(100, Math.round((points / meta.cost) * 100)) : 100;

  // Datos de la próxima cita ya formateados: los usa la tarjeta y se pasan a
  // la pantalla del QR para no volver a consultarlos.
  const cita = useMemo(() => {
    if (!next) return null;
    const fecha = next.startAt ? new Date(next.startAt) : null;
    return {
      id: next.id,
      titulo: treatmentNames[next.treatmentId] ?? "Tu cita",
      cuando: fecha ? `${etiquetaDia(fecha)} · ${etiquetaHora(fecha)}` : "Fecha por confirmar",
      sucursal: next.clinicId ? clinicNames[next.clinicId] : undefined,
    };
  }, [next, treatmentNames, clinicNames]);

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
      <Text style={styles.hello}>Hola{firstName ? `, ${firstName}` : ""}</Text>

      {/* Cisnes: franja compacta y tocable, no el protagonista de la pantalla */}
      <Pressable
        onPress={() => irATab("Recompensas")}
        style={({ pressed }) => [styles.swans, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
      >
        <View style={styles.swansTop}>
          <View style={styles.swansCount}>
            <Swan size={18} color={colors.goldSoft} />
            <Text style={styles.swansNum}>{points}</Text>
            <Text style={styles.swansUnit}>Cisnes</Text>
          </View>
          <Text style={styles.swansLink}>
            {meta ? `Faltan ${meta.cost - points}` : "Canjear"} ›
          </Text>
        </View>
        {meta ? (
          <>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.swansCap} numberOfLines={1}>
              Próxima recompensa: {meta.title}
            </Text>
          </>
        ) : (
          <Text style={styles.swansCap}>
            {points > 0 ? "Ya puedes canjear recompensas." : "Acumula Cisnes en cada visita."}
          </Text>
        )}
      </Pressable>

      {/* Sin ficha ligada no hay citas ni Cisnes que mostrar */}
      {!patient && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Aún no encontramos tu ficha. Pide en la clínica que registren tu
            correo para ver tus Cisnes e historial.
          </Text>
        </View>
      )}

      {/* Próxima cita — lo primero que la clienta busca al abrir la app */}
      <Text style={styles.sectionLbl}>TU PRÓXIMA CITA</Text>
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.xl }} />
      ) : cita ? (
        <View style={styles.next}>
          <Text style={styles.nextTitle}>{cita.titulo}</Text>
          <Text style={styles.nextWhen}>
            {cita.cuando}
            {cita.sucursal ? ` · ${cita.sucursal}` : ""}
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate("MiQr", {
                appointmentId: cita.id,
                titulo: cita.titulo,
                cuando: cita.cuando,
                sucursal: cita.sucursal,
              })
            }
            style={({ pressed }) => [styles.qrBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
          >
            <View style={styles.qrGlyph} />
            <Text style={styles.qrBtnText}>Ver mi código QR</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.nextEmpty}>
          <Text style={styles.nextEmptyTitle}>No tienes citas agendadas</Text>
          <Text style={styles.nextEmptyText}>
            Agenda la primera y aquí aparecerá tu código QR para mostrarlo al
            llegar.
          </Text>
        </View>
      )}

      {/* Acción principal de toda la app */}
      <Pressable
        onPress={() => irATab("Cita")}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>Agendar una cita</Text>
        <Text style={styles.ctaSub}>Elige sucursal, tratamiento y hora</Text>
      </Pressable>

      {/* Promociones: una sola franja horizontal, no una pila que empuja todo */}
      {promos.length > 0 && (
        <>
          <View style={styles.lblRow}>
            <Text style={styles.sectionLbl}>PROMOCIONES</Text>
            {promos.length > PROMOS_VER_TODAS && (
              <Pressable onPress={() => navigation.navigate("Promos")} hitSlop={8}>
                <Text style={styles.more}>Ver todas ›</Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {promos.slice(0, PROMOS_EN_INICIO).map((p, i) => (
              <PromoCard key={p.id} promo={p} variant="rail" index={i} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Accesos rápidos a los tabs que se consultan de vez en cuando */}
      <View style={styles.tiles}>
        {(
          [
            { tab: "Recompensas", icon: "recompensas", label: "Recompensas" },
            { tab: "Tienda", icon: "comprar", label: "Tienda" },
            { tab: "Ubicación", icon: "ubicacion", label: "Ubicación" },
          ] as { tab: string; icon: TabName; label: string }[]
        ).map((t) => (
          <Pressable
            key={t.tab}
            onPress={() => irATab(t.tab)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <TabIcon name={t.icon} color={colors.goldDeep} size={20} />
            <Text style={styles.tileText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

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
    fontSize: font.size.lg,
    color: colors.subtleOnCard,
    fontFamily: fonts.semibold,
    marginBottom: spacing.md,
  },

  // --- franja de Cisnes ---
  swans: {
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  swansTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  swansCount: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swansNum: { fontSize: font.size.xl, color: colors.cream, fontFamily: fonts.bold },
  swansUnit: { fontSize: font.size.sm, color: colors.goldSoft, fontFamily: fonts.semibold },
  swansLink: { fontSize: font.size.sm, color: colors.goldSoft, fontFamily: fonts.bold },
  bar: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  barFill: { height: "100%", backgroundColor: colors.gold },
  swansCap: { fontSize: font.size.xs, color: "#b7b1a5", fontFamily: fonts.regular, marginTop: 6 },

  warn: {
    backgroundColor: "rgba(217,138,122,0.12)",
    borderColor: "rgba(217,138,122,0.35)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  warnText: {
    color: "#7a4a40",
    fontSize: font.size.sm,
    lineHeight: 19,
    fontFamily: fonts.regular,
  },

  sectionLbl: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  lblRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  more: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.bold },

  // --- próxima cita ---
  next: {
    backgroundColor: colors.ground,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  nextTitle: {
    fontSize: font.size.xl + 2,
    color: colors.cream,
    fontFamily: fonts.displayRegular,
    lineHeight: 27,
  },
  nextWhen: {
    fontSize: font.size.sm,
    color: "#b7b1a5",
    fontFamily: fonts.regular,
    marginTop: 3,
  },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.lg,
  },
  qrGlyph: {
    width: 13,
    height: 13,
    borderWidth: 2.5,
    borderColor: "#231b06",
    borderRadius: 3,
  },
  qrBtnText: { color: "#231b06", fontFamily: fonts.bold, fontSize: font.size.md },
  nextEmpty: {
    backgroundColor: "#efeade",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    padding: spacing.lg,
  },
  nextEmptyTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.semibold,
  },
  nextEmptyText: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    fontFamily: fonts.regular,
    marginTop: 4,
    lineHeight: 19,
  },

  // --- CTA principal ---
  cta: {
    backgroundColor: colors.gold,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  ctaText: { color: "#231b06", fontFamily: fonts.extrabold, fontSize: font.size.xl - 2 },
  ctaSub: {
    color: "rgba(35,27,6,0.72)",
    fontFamily: fonts.semibold,
    fontSize: font.size.xs,
    marginTop: 2,
  },

  rail: { gap: spacing.md, paddingRight: spacing.lg, paddingVertical: 2 },

  // --- accesos rápidos ---
  tiles: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  tile: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 6,
  },
  tileText: {
    fontSize: font.size.xs,
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
  },

  // --- actividad ---
  empty: { color: colors.muted, fontSize: font.size.sm, fontFamily: fonts.regular },
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLine,
  },
  actDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  actReason: { fontSize: font.size.md, color: colors.ink, fontFamily: fonts.medium },
  actDate: { fontSize: font.size.xs, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  actPts: { fontSize: font.size.lg, fontFamily: fonts.bold },
});
