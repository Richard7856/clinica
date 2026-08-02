import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import QRCode from "react-native-qrcode-svg";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { requestAppointment, listMyAppointments } from "@/lib/appointments";
import { colors, spacing, radius, font } from "@/theme";
import type { Appointment, Clinic } from "@/lib/types";

// Tratamiento mínimo que necesita el selector (id + nombre).
interface TreatmentOption {
  id: string;
  name: string;
}

// Opciones de fecha rápida: fijan startAt a las 12:00 locales.
type DateKey = "hoy" | "manana" | "tres";
const DATE_OPTIONS: { key: DateKey; label: string; addDays: number }[] = [
  { key: "hoy", label: "Hoy", addDays: 0 },
  { key: "manana", label: "Mañana", addDays: 1 },
  { key: "tres", label: "En 3 días", addDays: 3 },
];

// Devuelve el ISO de un día (a las 12:00 locales) desplazado addDays.
function isoAtNoon(addDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// Traduce el estado del backend a etiqueta + color de badge.
function statusBadge(status: string): { label: string; bg: string; fg: string } {
  if (status === "requested")
    return { label: "Solicitada", bg: "#dbe7f3", fg: "#3a5b7a" };
  if (status === "scheduled" || status === "confirmed")
    return { label: status === "confirmed" ? "Confirmada" : "Agendada", bg: "#d8ede3", fg: "#3f7a5f" };
  if (status === "completed")
    return { label: "Completada", bg: "#e6e2d8", fg: colors.subtleOnCard };
  return { label: status, bg: "#e6e2d8", fg: colors.subtleOnCard };
}

export function CitaScreen() {
  const { patient } = useAuth();

  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selección del form.
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState<DateKey>("hoy");
  const [submitting, setSubmitting] = useState(false);

  // Carga inicial: tratamientos, clínicas y citas del paciente en paralelo.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [treatSnap, clinicSnap, myAppts] = await Promise.all([
          getDocs(collection(db, "treatments")),
          getDocs(collection(db, "clinics")),
          patient ? listMyAppointments(patient.id) : Promise.resolve([]),
        ]);
        if (!active) return;

        const treatRows: TreatmentOption[] = treatSnap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              name: (d.name as string) ?? "",
              active: d.active as boolean | undefined,
            };
          })
          .filter((t) => t.active !== false)
          .map((t) => ({ id: t.id, name: t.name }));

        const clinicRows: Clinic[] = clinicSnap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: (d.name as string) ?? "",
            address: d.address as string | undefined,
            phone: d.phone as string | undefined,
            active: Boolean(d.active),
          };
        });

        setTreatments(treatRows);
        setClinics(clinicRows);
        setAppointments(myAppts);
      } catch {
        if (active) {
          setTreatments([]);
          setClinics([]);
          setAppointments([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patient]);

  const selectedDateIso = useMemo(() => {
    const opt = DATE_OPTIONS.find((o) => o.key === dateKey) ?? DATE_OPTIONS[0];
    return isoAtNoon(opt.addDays);
  }, [dateKey]);

  async function onRequest() {
    if (!patient) return;
    if (!treatmentId) {
      Alert.alert("Falta tratamiento", "Elige un tratamiento para tu cita.");
      return;
    }
    setSubmitting(true);
    try {
      await requestAppointment({
        patientId: patient.id,
        treatmentId,
        clinicId: clinicId ?? undefined,
        startAt: selectedDateIso,
      });
      // Recarga la lista para mostrar la nueva cita con su QR.
      const myAppts = await listMyAppointments(patient.id);
      setAppointments(myAppts);
      Alert.alert("¡Cita solicitada!", "Muestra el QR de tu cita al llegar.");
    } catch (e) {
      Alert.alert(
        "No se pudo pedir la cita",
        e instanceof Error ? e.message : "Intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Sin sesión: no puede pedir citas.
  if (!patient) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi cita</Text>
          <Text style={styles.subtitle}>Pide tu cita y muestra el QR al llegar.</Text>
        </View>
        <Text style={styles.empty}>Inicia sesión para pedir citas.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mi cita</Text>
        <Text style={styles.subtitle}>Pide tu cita y muestra el QR al llegar.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : (
        <>
          {/* Form: pedir cita */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pedir cita</Text>

            <Text style={styles.fieldLabel}>Tratamiento</Text>
            <View style={styles.chipWrap}>
              {treatments.length === 0 ? (
                <Text style={styles.hint}>No hay tratamientos disponibles.</Text>
              ) : (
                treatments.map((t) => {
                  const on = treatmentId === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTreatmentId(t.id)}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            {clinics.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Clínica</Text>
                <View style={styles.chipWrap}>
                  {clinics.map((c) => {
                    const on = clinicId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setClinicId(on ? null : c.id)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>Fecha</Text>
            <View style={styles.chipWrap}>
              {DATE_OPTIONS.map((o) => {
                const on = dateKey === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => setDateKey(o.key)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({ pressed }) => [
                treatmentId ? styles.primaryBtn : styles.primaryBtnDisabled,
                pressed && treatmentId && { opacity: 0.9 },
              ]}
              onPress={onRequest}
              disabled={!treatmentId || submitting}
            >
              <Text
                style={treatmentId ? styles.primaryText : styles.primaryTextDisabled}
              >
                {submitting ? "Pidiendo…" : "Pedir cita"}
              </Text>
            </Pressable>
          </View>

          {/* Lista: mis citas */}
          <Text style={styles.sectionLbl}>MIS CITAS</Text>
          {appointments.length === 0 ? (
            <Text style={styles.empty}>Aún no tienes citas.</Text>
          ) : (
            appointments.map((a) => {
              const badge = statusBadge(a.status);
              const dateLabel = a.startAt
                ? new Date(a.startAt).toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Fecha por confirmar";
              return (
                <View key={a.id} style={styles.card}>
                  <View style={styles.apptTop}>
                    <Text style={styles.apptDate}>{dateLabel}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {a.pointsAwarded ? (
                    <View style={styles.awarded}>
                      <Text style={styles.awardedText}>✓ Cisnes asignados</Text>
                    </View>
                  ) : (
                    <View style={styles.qrBox}>
                      <QRCode
                        value={a.id}
                        size={160}
                        backgroundColor="#fff"
                        color={colors.ground}
                      />
                      <Text style={styles.qrCaption}>
                        Muestra este QR en la clínica para tus Cisnes
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
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
    fontWeight: "300",
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: font.size.xl,
    fontWeight: "400",
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
  },
  chipOn: {
    backgroundColor: colors.ground,
    borderColor: colors.ground,
  },
  chipText: {
    fontSize: font.size.sm,
    color: colors.textOnCard,
    fontWeight: "500",
  },
  chipTextOn: { color: colors.goldSoft, fontWeight: "700" },
  hint: { fontSize: font.size.sm, color: colors.subtleOnCard },
  primaryBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: font.size.md,
    letterSpacing: 0.5,
  },
  primaryBtnDisabled: {
    backgroundColor: "#eee9dd",
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryTextDisabled: {
    color: colors.subtleOnCard,
    fontWeight: "600",
    fontSize: font.size.md,
  },
  sectionLbl: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "600",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  apptTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  apptDate: {
    fontSize: font.size.md,
    color: colors.textOnCard,
    fontWeight: "500",
    flex: 1,
    textTransform: "capitalize",
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: font.size.xs, fontWeight: "700", letterSpacing: 0.5 },
  qrBox: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  qrCaption: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    textAlign: "center",
    marginTop: spacing.md,
  },
  awarded: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  awardedText: {
    fontSize: font.size.md,
    color: colors.ok,
    fontWeight: "700",
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xl,
  },
});
