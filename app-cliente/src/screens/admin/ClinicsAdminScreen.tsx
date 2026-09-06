import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { listClinics, createClinic, updateClinic, deleteClinic } from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader, useBack } from "@/components/ui/Screen";
import { RowActions } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { HorarioEditor, horarioCompleto, VisitasEditor } from "@/components/form/HorarioEditor";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";
import type { Clinic, Horario, ModoClinica, VisitaClinica } from "@/lib/types";

type Campo = "name";
const VACIO = { name: "", address: "", phone: "" };

// Un día sin rango se guarda como "Cerrado"; no guardamos días vacíos para
// que el horario del documento siempre tenga los siete.
function limpiar(lista: Horario[]): Horario[] {
  return lista.map((d) => ({ dia: d.dia, h: d.h.trim() || "Cerrado" }));
}

// Panel admin: sucursales. Los aparatos, tratamientos y citas se etiquetan con
// el id de la clínica, por eso eliminar una no es inocuo.
export function ClinicsAdminScreen() {
  const back = useBack();
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Clinic | "nueva" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [horAparato, setHorAparato] = useState<Horario[]>(horarioCompleto(undefined));
  const [horDoctora, setHorDoctora] = useState<Horario[]>(horarioCompleto(undefined));
  const [modo, setModo] = useState<ModoClinica>("semanal");
  const [visitas, setVisitas] = useState<VisitaClinica[]>([]);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setItems(await listClinics());
    } catch {
      setItems([]);
      toast.error("No se pudieron cargar las sucursales.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function abrir(c: Clinic | "nueva") {
    setEditing(c);
    setErrors({});
    setForm(
      c === "nueva"
        ? VACIO
        : { name: c.name, address: c.address ?? "", phone: c.phone ?? "" },
    );
    setHorAparato(horarioCompleto(c === "nueva" ? undefined : c.horarios?.aparato));
    setHorDoctora(horarioCompleto(c === "nueva" ? undefined : c.horarios?.doctora));
    setModo(c === "nueva" ? "semanal" : c.modo ?? "semanal");
    setVisitas(c === "nueva" ? [] : [...(c.visitas ?? [])]);
  }

  async function onSubmit() {
    const e: Errors<Campo> = { name: texto(form.name, 2, "El nombre") };
    setErrors(e);
    if (!esValido(e)) return;

    setSaving(true);
    try {
      const datos = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        modo,
        // Solo se guarda lo que aplica al modo elegido, para que no queden dos
        // calendarios contradictorios en el mismo documento.
        horarios:
          modo === "semanal"
            ? { aparato: limpiar(horAparato), doctora: limpiar(horDoctora) }
            : undefined,
        visitas:
          modo === "porVisita"
            ? visitas.filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.fecha.trim()))
            : [],
      };
      if (editing === "nueva") await createClinic(datos);
      else if (editing) await updateClinic(editing.id, datos);
      setEditing(null);
      await load();
      toast.success(editing === "nueva" ? "Sucursal creada." : "Sucursal actualizada.");
    } catch {
      toast.error("No se pudo guardar la sucursal.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(c: Clinic) {
    const ok = await confirm({
      title: "Eliminar sucursal",
      message: `Los tratamientos, aparatos y citas ligados a «${c.name}» se quedarán sin sucursal.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteClinic(c.id);
      await load();
      toast.success("Sucursal eliminada.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  // "Lun, Mar, Jue" — los días con atención, para leer de un vistazo.
  function resumen(lista: Horario[] | undefined): string {
    const abiertos = (lista ?? [])
      .filter((d) => d.h && !/cerrado/i.test(d.h))
      .map((d) => d.dia.slice(0, 3));
    return abiertos.length ? abiertos.join(", ") : "sin días";
  }

  function renderItem({ item }: { item: Clinic }) {
    return (
      <Card>
        <Text style={styles.title}>{item.name}</Text>
        {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
        {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
        {item.modo === "porVisita" ? (
          <Text style={styles.horario}>
            Por visita ·{" "}
            {item.visitas?.length
              ? `${item.visitas.length} ${item.visitas.length === 1 ? "fecha cargada" : "fechas cargadas"}`
              : "sin fechas cargadas"}
          </Text>
        ) : item.horarios ? (
          <Text style={styles.horario}>
            Aparatos: {resumen(item.horarios.aparato)} · Doctora:{" "}
            {resumen(item.horarios.doctora)}
          </Text>
        ) : (
          <Text style={styles.horario}>Sin horarios propios (usa el general).</Text>
        )}
        <RowActions onEdit={() => abrir(item)} onDelete={() => onDelete(item)} />
      </Card>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <ScreenHeader
            title="Clínicas"
            onBack={back}
            subtitle="Tus sucursales."
            actionLabel="+ Nueva"
            onAction={() => abrir("nueva")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="Sin sucursales"
              message="Agrega la primera para poder asignarle tratamientos y aparatos."
            />
          )
        }
      />

      <FormModal
        visible={editing !== null}
        title={editing === "nueva" ? "Nueva sucursal" : "Editar sucursal"}
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Field
          label="Nombre"
          required
          value={form.name}
          onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          placeholder="Ej. Pátzcuaro"
          error={errors.name}
        />
        <Field
          label="Dirección"
          value={form.address}
          onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
          placeholder="Ej. Portal Hidalgo 42, Centro"
        />
        <Field
          label="Teléfono"
          value={form.phone}
          onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
          placeholder="Ej. 434 342 1180"
          keyboardType="phone-pad"
        />

        <Select
          label="Cómo atiende"
          required
          options={[
            { value: "semanal", label: "Semana fija" },
            { value: "porVisita", label: "Por visita" },
          ]}
          value={modo}
          onChange={(v) => setModo((v as ModoClinica) ?? "semanal")}
          helper="«Por visita» es para sedes que se atienden solo en fechas puntuales."
        />

        {modo === "porVisita" ? (
          <VisitasEditor value={visitas} onChange={setVisitas} />
        ) : (
          <>
        <HorarioEditor
          label="Horario de aparatos"
          helper="Cuándo se pueden agendar los tratamientos de aparatología. Deja el día vacío si no se atiende."
          value={horAparato}
          onChange={setHorAparato}
        />
        <HorarioEditor
          label="Horario de la doctora"
          helper="Solo las horas en que la doctora está en ESTA sucursal. Si ese día está en otra sede, déjalo vacío."
          value={horDoctora}
          onChange={setHorDoctora}
        />
          </>
        )}
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  meta: { fontSize: font.size.sm, color: colors.muted, marginTop: 4, fontFamily: fonts.regular },
  horario: {
    fontSize: font.size.xs,
    color: colors.subtleOnCard,
    marginTop: 6,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
});
