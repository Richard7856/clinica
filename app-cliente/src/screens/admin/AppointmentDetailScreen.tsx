import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getAppointment,
  getPatient,
  listPaymentsFor,
  createPayment,
  saveAppointmentNotes,
  setAppointmentStatus,
} from "@/lib/admin";
import { listTreatments, listClinics, nombrePorId, motivoFallo } from "@/lib/catalog";
import { ScreenHeader, Card, SectionLabel, Loader } from "@/components/ui/Screen";
import { Pill } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { Button } from "@/components/form/Button";
import { Swan } from "@/components/Swan";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { useAuth } from "@/lib/auth";
import { numero } from "@/lib/validate";
import { etiquetaDia, etiquetaHora } from "@/lib/schedule";
import { colors, spacing, radius, font, fonts } from "@/theme";
import {
  PAYMENT_METHOD_LABEL,
  treatmentPriceLabel,
  type Appointment,
  type Patient,
  type Payment,
  type PaymentMethod,
  type Treatment,
} from "@/lib/types";
import type { CitasStackParams } from "@/navigation/AdminTabs";

type Props = NativeStackScreenProps<CitasStackParams, "Detalle">;

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitada",
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  requested: "#7a6cb0",
  scheduled: "#5b7fb0",
  confirmed: colors.ok,
  in_progress: colors.gold,
  completed: colors.muted,
  no_show: colors.danger,
  cancelled: colors.muted,
};

const METODOS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

function money(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}

// Detalle de una cita: quién viene, qué se le hizo, cuánto se cobró y cómo.
// Es donde recepción cierra la visita.
export function AppointmentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user } = useAuth();
  const toast = useToast();
  const confirmar = useConfirm();

  const [cita, setCita] = useState<Appointment | null>(null);
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [tratamiento, setTratamiento] = useState<Treatment | null>(null);
  const [clinicas, setClinicas] = useState<Record<string, string>>({});
  const [cobros, setCobros] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [notas, setNotas] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);

  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<PaymentMethod>("cash");
  const [errorMonto, setErrorMonto] = useState<string | undefined>();
  const [guardandoCobro, setGuardandoCobro] = useState(false);

  const load = useCallback(async () => {
    const apt = await getAppointment(id).catch(() => null);
    if (!apt) {
      toast.error("No se pudo cargar la cita.");
      setLoading(false);
      return;
    }
    setCita(apt);
    setNotas(apt.notes ?? "");

    const [pac, treats, cls, pagos] = await Promise.allSettled([
      getPatient(apt.patientId),
      listTreatments(),
      listClinics(),
      listPaymentsFor(apt.id),
    ]);
    if (pac.status === "fulfilled") setPaciente(pac.value);
    if (treats.status === "fulfilled")
      setTratamiento(treats.value.find((t) => t.id === apt.treatmentId) ?? null);
    if (cls.status === "fulfilled") setClinicas(nombrePorId(cls.value));
    if (pagos.status === "fulfilled") setCobros(pagos.value);
    else toast.error(`Cobros: ${motivoFallo(pagos.reason)}`);
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function onGuardarNotas() {
    if (!cita) return;
    setGuardandoNotas(true);
    try {
      await saveAppointmentNotes(cita.id, notas.trim());
      setCita({ ...cita, notes: notas.trim() });
      toast.success("Nota guardada.");
    } catch {
      toast.error("No se pudo guardar la nota.");
    } finally {
      setGuardandoNotas(false);
    }
  }

  function abrirCobro() {
    // Si el colaborador ya capturó un monto al escanear, se propone ese mismo:
    // aquí solo falta decir con qué se pagó, no volver a cobrar.
    setMonto(cita?.amountSpent ? String(cita.amountSpent) : "");
    setMetodo("cash");
    setErrorMonto(undefined);
    setCobroAbierto(true);
  }

  async function onGuardarCobro() {
    if (!cita || !paciente) return;
    const e = numero(monto, { min: 1, campo: "El monto" });
    setErrorMonto(e);
    if (e) return;

    setGuardandoCobro(true);
    try {
      await createPayment({
        patientId: cita.patientId,
        amount: Number(monto),
        method: metodo,
        refId: cita.id,
        receivedBy: user?.uid ?? "",
      });
      setCobroAbierto(false);
      await load();
      toast.success("Cobro registrado.");
    } catch {
      toast.error("No se pudo registrar el cobro.");
    } finally {
      setGuardandoCobro(false);
    }
  }

  async function cambiarEstado(status: string, aviso: string) {
    if (!cita) return;
    setCita({ ...cita, status });
    try {
      await setAppointmentStatus(cita.id, status);
      toast.success(aviso);
    } catch {
      load();
      toast.error("No se pudo actualizar la cita.");
    }
  }

  async function onCancelar() {
    const ok = await confirmar({
      title: "Cancelar cita",
      message: `Se cancelará la cita de ${paciente?.fullName ?? "la clienta"}. Avísale por tu cuenta: la app no manda aviso de cancelación.`,
      confirmText: "Cancelar cita",
      cancelText: "Volver",
      danger: true,
    });
    if (ok) cambiarEstado("cancelled", "Cita cancelada.");
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Cita" compact onBack={() => navigation.goBack()} />
        <Loader />
      </View>
    );
  }

  if (!cita) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Cita" compact onBack={() => navigation.goBack()} />
        <Text style={styles.nota}>Esta cita ya no existe.</Text>
      </View>
    );
  }

  const fecha = new Date(cita.startAt);
  const pasada = fecha.getTime() < Date.now();
  const abierta = ["requested", "scheduled", "confirmed"].includes(cita.status);
  const totalCobrado = cobros.reduce((a, c) => a + c.amount, 0);
  // Monto capturado al escanear el QR que todavía no tiene método de pago.
  const sinMetodo = cobros.length === 0 && (cita.amountSpent ?? 0) > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader title="Cita" compact onBack={() => navigation.goBack()} />

      <Card>
        <View style={styles.cuando}>
          <Text style={styles.dia}>{etiquetaDia(fecha)}</Text>
          <Pill
            label={STATUS_LABEL[cita.status] ?? cita.status}
            color={STATUS_COLOR[cita.status] ?? colors.muted}
          />
        </View>
        <Text style={styles.hora}>{etiquetaHora(fecha)}</Text>
        <Text style={styles.lugar}>
          {[
            tratamiento?.name ?? "Tratamiento",
            cita.clinicId ? clinicas[cita.clinicId] : null,
            cita.cabinId || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {tratamiento ? (
          <Text style={styles.precio}>
            Precio de lista: {treatmentPriceLabel(tratamiento)}
          </Text>
        ) : null}
      </Card>

      {/* Clienta */}
      <SectionLabel>Clienta</SectionLabel>
      <Card>
        <Text style={styles.nombre}>{paciente?.fullName ?? "Clienta sin ficha"}</Text>
        {paciente?.phone ? <Text style={styles.dato}>{paciente.phone}</Text> : null}
        {paciente?.email ? <Text style={styles.dato}>{paciente.email}</Text> : null}
        {paciente ? (
          <View style={styles.cisnes}>
            <Swan size={15} color={colors.goldDeep} />
            <Text style={styles.cisnesNum}>{paciente.points}</Text>
            <Text style={styles.cisnesLbl}>Cisnes</Text>
          </View>
        ) : null}
      </Card>

      {/* Qué se hizo */}
      <SectionLabel>Qué se hizo</SectionLabel>
      <Card>
        <Field
          label="Notas de la visita"
          value={notas}
          onChangeText={setNotas}
          placeholder="Producto usado, zonas tratadas, indicaciones…"
          multiline
        />
        <Button
          title="Guardar nota"
          variant="ghost"
          onPress={onGuardarNotas}
          loading={guardandoNotas}
          disabled={notas.trim() === (cita.notes ?? "")}
        />
      </Card>

      {/* Cobro */}
      <SectionLabel>Cobro</SectionLabel>
      <Card>
        {cobros.length > 0 ? (
          <>
            {cobros.map((c) => (
              <View key={c.id} style={styles.cobroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cobroMonto}>{money(c.amount)}</Text>
                  <Text style={styles.dato}>
                    {PAYMENT_METHOD_LABEL[c.method]} ·{" "}
                    {new Date(c.date).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
              </View>
            ))}
            {cobros.length > 1 ? (
              <Text style={styles.total}>Total: {money(totalCobrado)}</Text>
            ) : null}
            <Button
              title="Registrar otro cobro"
              variant="ghost"
              onPress={abrirCobro}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : sinMetodo ? (
          <>
            <Text style={styles.cobroMonto}>{money(cita.amountSpent ?? 0)}</Text>
            <Text style={styles.aviso}>
              Capturado al escanear el QR, sin método de pago. Regístralo para que
              aparezca en «Cómo te pagan».
            </Text>
            <Button
              title="Registrar método de pago"
              onPress={abrirCobro}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <>
            <Text style={styles.nota}>Todavía no hay cobro registrado.</Text>
            <Button title="Registrar cobro" onPress={abrirCobro} style={{ marginTop: spacing.md }} />
          </>
        )}
      </Card>

      {/* Cisnes */}
      <SectionLabel>Cisnes</SectionLabel>
      <Card>
        {cita.pointsAwarded ? (
          <Text style={styles.ok}>✓ Cisnes ya asignados por esta visita.</Text>
        ) : (
          <Text style={styles.nota}>
            Sin Cisnes asignados. Se otorgan cuando el colaborador escanea el QR de
            la clienta; registrar el cobro aquí no los asigna.
          </Text>
        )}
      </Card>

      {/* Estado */}
      {abierta ? (
        <>
          <SectionLabel>Estado de la cita</SectionLabel>
          <Card>
            {pasada ? (
              <View style={styles.botones}>
                <Button
                  title="Marcar atendida"
                  variant="dark"
                  onPress={() => cambiarEstado("completed", "Cita marcada como atendida.")}
                  style={{ flex: 1 }}
                />
                <Button
                  title="No asistió"
                  variant="ghost"
                  onPress={() => cambiarEstado("no_show", "Marcada como no asistió.")}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <View style={styles.botones}>
                {cita.status === "requested" ? (
                  <Button
                    title="Confirmar"
                    variant="dark"
                    onPress={() => cambiarEstado("confirmed", "Cita confirmada.")}
                    style={{ flex: 1 }}
                  />
                ) : null}
                <Button
                  title="Cancelar cita"
                  variant="ghost"
                  onPress={onCancelar}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </Card>
        </>
      ) : null}

      <FormModal
        visible={cobroAbierto}
        title={sinMetodo ? "Método de pago" : "Registrar cobro"}
        subtitle={
          sinMetodo
            ? "El monto ya se capturó al escanear; falta con qué se pagó."
            : "Queda ligado a esta cita."
        }
        onClose={() => setCobroAbierto(false)}
        onSubmit={onGuardarCobro}
        saving={guardandoCobro}
        submitText="Registrar"
      >
        <Field
          label="Monto"
          required
          value={monto}
          onChangeText={setMonto}
          placeholder="1800"
          keyboardType="numeric"
          prefix="$"
          error={errorMonto}
          helper={
            tratamiento ? `Precio de lista: ${treatmentPriceLabel(tratamiento)}` : undefined
          }
        />
        <Select
          label="Método de pago"
          required
          options={METODOS}
          value={metodo}
          onChange={(v) => setMetodo((v as PaymentMethod) ?? "cash")}
        />
      </FormModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  cuando: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  dia: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.semibold },
  hora: { fontSize: 32, color: colors.ink, fontFamily: fonts.display, lineHeight: 38, marginTop: 2 },
  lugar: { fontSize: font.size.md, color: colors.subtleOnCard, fontFamily: fonts.regular, marginTop: 4 },
  precio: { fontSize: font.size.sm, color: colors.muted, fontFamily: fonts.regular, marginTop: 6 },
  nombre: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  dato: { fontSize: font.size.sm, color: colors.muted, fontFamily: fonts.regular, marginTop: 3 },
  cisnes: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.md },
  cisnesNum: { fontSize: font.size.lg, color: colors.goldDeep, fontFamily: fonts.extrabold },
  cisnesLbl: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.semibold },
  cobroRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  cobroMonto: { fontSize: font.size.xl, color: colors.ink, fontFamily: fonts.bold },
  total: {
    fontSize: font.size.md,
    color: colors.textOnCard,
    fontFamily: fonts.bold,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
  },
  aviso: { fontSize: font.size.sm, color: "#7a5c1f", fontFamily: fonts.regular, marginTop: 4, lineHeight: 18 },
  nota: { fontSize: font.size.sm, color: colors.subtleOnCard, fontFamily: fonts.regular, lineHeight: 18 },
  ok: { fontSize: font.size.md, color: colors.ok, fontFamily: fonts.bold },
  botones: { flexDirection: "row", gap: spacing.md },
});
