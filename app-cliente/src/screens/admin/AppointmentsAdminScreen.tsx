import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, TextInput, StyleSheet, Pressable } from "react-native";
import { listAppointments, setAppointmentStatus, listPatients } from "@/lib/admin";
import { listTreatments, listClinics, nombrePorId, motivoFallo } from "@/lib/catalog";
import { ScreenHeader, Card, EmptyState, Loader } from "@/components/ui/Screen";
import { Segmented, Pill, type SegmentedOption } from "@/components/ui/Controls";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { etiquetaDia, etiquetaHora, esMismoDia } from "@/lib/schedule";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Appointment } from "@/lib/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CitasStackParams } from "@/navigation/AdminTabs";

type Props = NativeStackScreenProps<CitasStackParams, "Agenda">;

// La agenda de la clínica. Antes era una lista plana en orden inverso donde
// una cita de hace un mes se veía igual que la de esta tarde. Ahora se agrupa
// por día, va en orden cronológico y separa lo que necesita una decisión.

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

type Filtro = "porConfirmar" | "hoy" | "proximas" | "historial";

const FILTROS: SegmentedOption<Filtro>[] = [
  { value: "porConfirmar", label: "Pendientes" },
  { value: "hoy", label: "Hoy" },
  { value: "proximas", label: "Próximas" },
  { value: "historial", label: "Historial" },
];

const VACIOS: Record<Filtro, { title: string; message: string }> = {
  porConfirmar: {
    title: "Nada por confirmar",
    message: "Cuando una clienta pida cita desde la app, aparecerá aquí para que la confirmes.",
  },
  hoy: { title: "No hay citas para hoy", message: "Revisa «Próximas» para ver lo que viene." },
  proximas: {
    title: "Sin citas próximas",
    message: "Todavía no hay nada agendado de hoy en adelante.",
  },
  historial: { title: "Sin citas pasadas", message: "Aquí quedará el registro de lo atendido." },
};

export function AppointmentsAdminScreen({ navigation }: Props) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [pacientes, setPacientes] = useState<Record<string, string>>({});
  const [tratamientos, setTratamientos] = useState<Record<string, string>>({});
  const [clinicas, setClinicas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("porConfirmar");
  const [q, setQ] = useState("");
  const toast = useToast();
  const confirmar = useConfirm();

  const load = useCallback(async () => {
    const [apts, pats, treats, cls] = await Promise.allSettled([
      listAppointments(),
      listPatients(),
      listTreatments(),
      listClinics(),
    ]);
    if (apts.status === "fulfilled") setItems(apts.value);
    else {
      setItems([]);
      toast.error(`Citas: ${motivoFallo(apts.reason)}`);
    }
    if (pats.status === "fulfilled")
      setPacientes(Object.fromEntries(pats.value.map((p) => [p.id, p.fullName])));
    if (treats.status === "fulfilled") setTratamientos(nombrePorId(treats.value));
    if (cls.status === "fulfilled") setClinicas(nombrePorId(cls.value));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Cuántas esperan confirmación: es el número que decide si hay trabajo.
  const porConfirmarTotal = useMemo(
    () => items.filter((a) => a.status === "requested").length,
    [items],
  );

  const secciones = useMemo(() => {
    const ahora = new Date();
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const needle = q.trim().toLowerCase();

    let lista = items.filter((a) => {
      const f = new Date(a.startAt);
      if (filtro === "porConfirmar") return a.status === "requested";
      if (filtro === "hoy") return esMismoDia(f, ahora);
      if (filtro === "proximas") return f >= inicioHoy;
      return f < inicioHoy;
    });

    if (needle) {
      lista = lista.filter((a) =>
        (pacientes[a.patientId] ?? "").toLowerCase().includes(needle),
      );
    }

    // El historial va de lo más reciente hacia atrás; todo lo demás, hacia
    // adelante: lo primero que se lee debe ser lo próximo que pasa.
    lista.sort((x, y) =>
      filtro === "historial"
        ? y.startAt.localeCompare(x.startAt)
        : x.startAt.localeCompare(y.startAt),
    );

    const grupos = new Map<string, Appointment[]>();
    for (const a of lista) {
      const k = etiquetaDia(new Date(a.startAt));
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(a);
    }
    return [...grupos.entries()].map(([title, data]) => ({ title, data }));
  }, [items, filtro, q, pacientes]);

  async function cambiarEstado(a: Appointment, status: string, aviso: string) {
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, status } : x)));
    try {
      await setAppointmentStatus(a.id, status);
      toast.success(aviso);
    } catch {
      load();
      toast.error("No se pudo actualizar la cita.");
    }
  }

  async function onCancelar(a: Appointment) {
    const ok = await confirmar({
      title: "Cancelar cita",
      message: `Se cancelará la cita de ${pacientes[a.patientId] ?? "la clienta"}. Avísale por tu cuenta: la app no manda aviso de cancelación.`,
      confirmText: "Cancelar cita",
      cancelText: "Volver",
      danger: true,
    });
    if (!ok) return;
    cambiarEstado(a, "cancelled", "Cita cancelada.");
  }

  function renderItem({ item }: { item: Appointment }) {
    const fecha = new Date(item.startAt);
    const label = STATUS_LABEL[item.status] ?? item.status;
    const color = STATUS_COLOR[item.status] ?? colors.muted;
    const detalle = [tratamientos[item.treatmentId], item.clinicId ? clinicas[item.clinicId] : null]
      .filter(Boolean)
      .join(" · ");
    // Una cita del pasado no se cancela: se cierra diciendo si la clienta
    // vino o no. Los Cisnes siguen dependiendo del escaneo del QR.
    const pasada = fecha.getTime() < Date.now();
    const abierta = ["requested", "scheduled", "confirmed"].includes(item.status);

    return (
      <Card style={styles.card}>
        <Pressable
          onPress={() => navigation.navigate("Detalle", { id: item.id })}
          style={({ pressed }) => [styles.fila, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={styles.hora}>{etiquetaHora(fecha)}</Text>
          <View style={styles.centro}>
            <Text style={styles.paciente} numberOfLines={1}>
              {pacientes[item.patientId] ?? "Clienta sin ficha"}
            </Text>
            {detalle ? (
              <Text style={styles.detalle} numberOfLines={1}>
                {detalle}
              </Text>
            ) : null}
          </View>
          <Pill label={label} color={color} />
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {abierta ? (
          <View style={styles.acciones}>
            {pasada ? (
              <>
                <Pressable
                  onPress={() => cambiarEstado(item, "completed", "Cita marcada como atendida.")}
                  style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnText}>Marcar atendida</Text>
                </Pressable>
                <Pressable
                  onPress={() => cambiarEstado(item, "no_show", "Marcada como no asistió.")}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelar}>No asistió</Text>
                </Pressable>
              </>
            ) : (
              <>
                {item.status === "requested" ? (
                  <Pressable
                    onPress={() => cambiarEstado(item, "confirmed", "Cita confirmada.")}
                    style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.btnText}>Confirmar</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => onCancelar(item)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.cancelar}>Cancelar</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <View style={styles.root}>
      <SectionList
        sections={secciones}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dia}>{section.title}</Text>
        )}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="Agenda"
              subtitle={
                porConfirmarTotal > 0
                  ? `${porConfirmarTotal} ${porConfirmarTotal === 1 ? "cita espera" : "citas esperan"} tu confirmación.`
                  : "Todo confirmado por ahora."
              }
            />
            <Segmented options={FILTROS} value={filtro} onChange={setFiltro} />
            <TextInput
              style={styles.buscar}
              placeholder="Buscar por nombre de clienta…"
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : q ? (
            <EmptyState
              title="Sin resultados"
              message={`Ninguna cita de «${q}» en esta vista.`}
            />
          ) : (
            <EmptyState {...VACIOS[filtro]} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  buscar: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink,
    fontFamily: fonts.regular,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dia: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  fila: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hora: {
    fontSize: font.size.sm,
    color: colors.goldDeep,
    fontFamily: fonts.bold,
    width: 66,
  },
  centro: { flex: 1 },
  chevron: { fontSize: 22, color: colors.muted, marginLeft: 2, fontFamily: fonts.regular },
  paciente: { fontSize: font.size.md, color: colors.textOnCard, fontFamily: fonts.medium },
  detalle: { fontSize: font.size.xs, color: colors.muted, fontFamily: fonts.regular, marginTop: 1 },
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
  },
  btn: {
    backgroundColor: colors.ground,
    borderRadius: radius.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
  },
  btnText: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: font.size.sm },
  cancelar: { color: colors.danger, fontSize: font.size.sm, fontFamily: fonts.bold },
});
