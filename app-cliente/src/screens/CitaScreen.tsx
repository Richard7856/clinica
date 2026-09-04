import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { listTreatments, listClinics, loadHorarios, motivoFallo } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { requestAppointment, listMyAppointments } from "@/lib/appointments";
import { sendAppointmentQrEmail } from "@/lib/notify";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Appointment, Clinic, Treatment } from "@/lib/types";
import { treatmentPriceLabel } from "@/lib/types";
import { Picker, type PickerOption } from "@/components/form/Picker";
import { Select } from "@/components/form/Select";
import { Button } from "@/components/form/Button";
import { useToast } from "@/components/ui/UIProvider";
import {
  HORARIOS_DEFAULT,
  proximosDias,
  slotsDelDia,
  esCerrado,
  fechaConSlot,
  horariosDe,
  type Horario,
} from "@/lib/schedule";
import { RECURSO_LABEL } from "@/lib/types";

// "90" → "1 h 30 min". Los tratamientos van de 15 minutos a 3 horas.
function duracionTexto(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
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

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState<string | undefined>();

  // Selección del form.
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>(HORARIOS_DEFAULT);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Carga inicial: tratamientos, clínicas y citas del paciente en paralelo.
  useEffect(() => {
    let active = true;
    (async () => {
      // Independientes: que no poder leer las citas propias impida además
      // ver el catálogo y pedir una nueva.
      const [treatRes, clinicRes, hsRes, apptRes] = await Promise.allSettled([
        listTreatments(),
        listClinics(),
        loadHorarios(),
        patient ? listMyAppointments(patient.id) : Promise.resolve([]),
      ]);
      if (!active) return;

      setTreatments(treatRes.status === "fulfilled" ? treatRes.value : []);
      setClinics(clinicRes.status === "fulfilled" ? clinicRes.value : []);
      if (hsRes.status === "fulfilled") setHorarios(hsRes.value);
      setAppointments(apptRes.status === "fulfilled" ? apptRes.value : []);
      setFallo(
        treatRes.status === "rejected"
          ? motivoFallo(treatRes.reason)
          : clinicRes.status === "rejected"
            ? motivoFallo(clinicRes.reason)
            : undefined,
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patient]);

  // Próximos 14 días para el selector de fecha.
  const dias = useMemo(() => proximosDias(14), []);
  const selectedDate = dias[dayIdx] ?? dias[0];

  const selectedTreatment = useMemo(
    () => treatments.find((t) => t.id === treatmentId) ?? null,
    [treatments, treatmentId],
  );

  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === clinicId) ?? null,
    [clinics, clinicId],
  );

  // El horario depende del recurso: la doctora viaja entre sedes y los
  // aparatos se quedan, así que cada tratamiento tiene su propia ventana.
  const horariosAplican = useMemo(
    () => horariosDe(selectedClinic, selectedTreatment?.requires, horarios),
    [selectedClinic, selectedTreatment, horarios],
  );

  // Espacios de 30 min que caben completos dentro de la ventana del recurso.
  const slots = useMemo(
    () => slotsDelDia(selectedDate, horariosAplican, selectedTreatment?.durationMin ?? 30, 30),
    [selectedDate, horariosAplican, selectedTreatment],
  );
  const cerrado = esCerrado(selectedDate, horariosAplican);

  // Qué días tienen espacio de verdad para ESTE tratamiento. No basta con que
  // la clínica abra: hoy puede estar abierta y que la ventana ya haya pasado,
  // o que no quepa un tratamiento de tres horas antes de cerrar.
  const diasConEspacio = useMemo(
    () =>
      dias.map(
        (d) =>
          slotsDelDia(d, horariosAplican, selectedTreatment?.durationMin ?? 30, 30).length > 0,
      ),
    [dias, horariosAplican, selectedTreatment],
  );

  // Si el día en pantalla no tiene espacio para este tratamiento, saltamos al
  // primero que sí. Antes solo saltaba si la clínica estaba cerrada, así que
  // al elegir un tratamiento por la tarde se quedaba en "ya no quedan horarios".
  useEffect(() => {
    if (diasConEspacio[dayIdx]) return;
    const libre = diasConEspacio.findIndex(Boolean);
    if (libre >= 0) setDayIdx(libre);
    // Solo corrige el arranque y los cambios de tratamiento o sucursal; si la
    // clienta toca a propósito un día sin espacio, se respeta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diasConEspacio]);



  // Solo los tratamientos que se ofrecen en la sucursal elegida. Si un
  // tratamiento no trae clinicIds (dato viejo), se muestra en todas.
  const visibleTreatments = useMemo(() => {
    if (!clinicId) return treatments;
    return treatments.filter(
      (t) => t.clinicIds.length === 0 || t.clinicIds.includes(clinicId),
    );
  }, [treatments, clinicId]);

  // Opciones del desplegable: agrupadas por categoría y con el precio a la vista.
  const treatmentOptions = useMemo<PickerOption[]>(
    () =>
      ["facial", "corporal"].flatMap((cat) =>
        visibleTreatments
          .filter((t) => t.category === cat)
          .map((t) => ({
            value: t.id,
            label: t.name,
            hint: treatmentPriceLabel(t),
            group: cat === "facial" ? "Faciales" : "Corporales",
          })),
      ),
    [visibleTreatments],
  );

  async function onRequest() {
    if (!patient) return;
    if (!treatmentId) return toast.error("Elige un tratamiento para tu cita.");
    if (!slot) return toast.error("Elige un horario disponible.");

    setSubmitting(true);
    try {
      const newId = await requestAppointment({
        patientId: patient.id,
        treatmentId,
        clinicId: clinicId ?? undefined,
        startAt: fechaConSlot(selectedDate, slot).toISOString(),
      });
      // Envía el correo con el QR (best-effort, no bloquea).
      sendAppointmentQrEmail(newId).catch(() => {});
      const myAppts = await listMyAppointments(patient.id);
      setAppointments(myAppts);
      setSlot(null);
      toast.success("¡Cita solicitada! Muestra el QR al llegar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo pedir la cita.");
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

            <Select
              label="Sucursal"
              required
              options={clinics.map((c) => ({ value: c.id, label: c.name }))}
              value={clinicId}
              onChange={(v) => {
                setClinicId(v);
                // El tratamiento puede no existir en la otra sede.
                setTreatmentId(null);
                setSlot(null);
              }}
              empty={fallo ?? "Sin sucursales disponibles."}
            />

            <Picker
              label="Tratamiento"
              required
              title="Elige tu tratamiento"
              placeholder={
                clinicId || clinics.length === 0
                  ? "Selecciona un tratamiento"
                  : "Primero elige una sucursal"
              }
              disabled={!clinicId && clinics.length > 0}
              options={treatmentOptions}
              value={treatmentId}
              onChange={(v) => {
                setTreatmentId(v);
                setSlot(null);
              }}
              helper={
                selectedTreatment
                  ? [
                      `Duración: ${duracionTexto(selectedTreatment.durationMin ?? 30)}`,
                      selectedTreatment.requires === "doctora"
                        ? RECURSO_LABEL.doctora.toLowerCase()
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : undefined
              }
              empty={fallo ?? "No hay tratamientos en esta sucursal."}
            />

            <Text style={styles.fieldLabel}>Fecha</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {dias.map((d, i) => {
                const on = i === dayIdx;
                const closed = !diasConEspacio[i];
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => {
                      setDayIdx(i);
                      setSlot(null);
                    }}
                    style={[styles.day, on && styles.dayOn, closed && styles.dayClosed]}
                  >
                    <Text style={[styles.dayName, on && styles.dayTextOn]}>
                      {d.toLocaleDateString("es-MX", { weekday: "short" })}
                    </Text>
                    <Text style={[styles.dayNum, on && styles.dayTextOn]}>{d.getDate()}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Horario</Text>
            {cerrado ? (
              <Text style={styles.hint}>
                {selectedTreatment?.requires === "doctora"
                  ? "La doctora no atiende ese día en esta sucursal. Elige otra fecha."
                  : "Cerrado ese día. Elige otra fecha."}
              </Text>
            ) : slots.length === 0 ? (
              <Text style={styles.hint}>
                {(selectedTreatment?.durationMin ?? 30) > 60
                  ? "Ese día ya no queda un espacio libre del tamaño de este tratamiento."
                  : "Ya no quedan horarios ese día."}
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {slots.map((h) => {
                  const on = slot === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setSlot(h)}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{h}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Button
              title="Pedir cita"
              onPress={onRequest}
              loading={submitting}
              disabled={!treatmentId || !slot}
              style={{ marginTop: spacing.lg }}
            />
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
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.muted,
    marginTop: spacing.xs, fontFamily: fonts.regular },
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
    fontFamily: fonts.regular,
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
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
    fontFamily: fonts.medium,
  },
  chipTextOn: { color: colors.goldSoft, fontFamily: fonts.bold },
  chipPrice: {
    fontSize: font.size.xs,
    color: colors.goldDeep,
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  chipPriceOn: { color: colors.goldSoft },
  catLabel: {
    fontSize: font.size.xs,
    color: colors.subtleOnCard,
    fontFamily: fonts.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: font.size.sm, color: colors.subtleOnCard, fontFamily: fonts.regular },
  daysRow: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.md },
  day: {
    width: 54,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardLine,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  dayOn: { backgroundColor: colors.ground, borderColor: colors.ground },
  dayClosed: { opacity: 0.4 },
  dayName: {
    fontSize: font.size.xs,
    color: colors.muted,
    textTransform: "capitalize",
    fontFamily: fonts.semibold,
  },
  dayNum: { fontSize: font.size.lg, color: colors.ink, fontFamily: fonts.bold, marginTop: 2 },
  dayTextOn: { color: colors.goldSoft },
  primaryBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryText: {
    color: colors.ink,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.semibold,
    fontSize: font.size.md,
  },
  sectionLbl: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
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
    fontFamily: fonts.medium,
    flex: 1,
    textTransform: "capitalize",
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: font.size.xs, fontFamily: fonts.bold, letterSpacing: 0.5 },
  qrBox: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  qrCaption: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    textAlign: "center",
    marginTop: spacing.md, fontFamily: fonts.regular },
  awarded: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  awardedText: {
    fontSize: font.size.md,
    color: colors.ok,
    fontFamily: fonts.bold,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xl, fontFamily: fonts.regular },
});
