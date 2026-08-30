import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import {
  listDevices,
  setDeviceStatus,
  createDevice,
  updateDevice,
  listClinics,
} from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader, useBack } from "@/components/ui/Screen";
import { Segmented, RowActions, type SegmentedOption } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { useToast } from "@/components/ui/UIProvider";
import { texto, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";
import type { Device, Clinic } from "@/lib/types";

type DeviceStatus = Device["status"];
type Campo = "name";
const VACIO = { name: "", type: "", hours: "" };

const STATUS_META: Record<DeviceStatus, { label: string; color: string }> = {
  active: { label: "Activo", color: colors.ok },
  maintenance: { label: "Mantenim.", color: colors.gold },
  disabled: { label: "Baja", color: colors.muted },
};

const STATUS_OPTIONS: SegmentedOption<DeviceStatus>[] = [
  { value: "active", label: "Activo" },
  { value: "maintenance", label: "Mantenim." },
  { value: "disabled", label: "Baja" },
];

// Panel admin: aparatos de la clínica, su estado, sucursal y horario.
export function DevicesAdminScreen() {
  const back = useBack();
  const [items, setItems] = useState<Device[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Device | "nuevo" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [devs, cls] = await Promise.all([listDevices(), listClinics()]);
      setItems(devs);
      setClinics(cls);
    } catch {
      setItems([]);
      setClinics([]);
      toast.error("No se pudieron cargar los aparatos.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function clinicName(id?: string): string {
    if (!id) return "Sin sucursal";
    return clinics.find((c) => c.id === id)?.name ?? "Sin sucursal";
  }

  function abrir(d: Device | "nuevo") {
    setEditing(d);
    setErrors({});
    setClinicId(d === "nuevo" ? null : d.clinicId ?? null);
    setForm(
      d === "nuevo"
        ? VACIO
        : { name: d.name, type: d.type ?? "", hours: d.hours ?? "" },
    );
  }

  async function onSubmit() {
    const e: Errors<Campo> = { name: texto(form.name, 2, "El nombre") };
    setErrors(e);
    if (!esValido(e)) return;

    setSaving(true);
    try {
      if (editing === "nuevo") {
        await createDevice({
          name: form.name.trim(),
          type: form.type.trim(),
          clinicId: clinicId ?? undefined,
          hours: form.hours.trim(),
        });
      } else if (editing) {
        await updateDevice(editing.id, {
          clinicId: clinicId ?? undefined,
          hours: form.hours.trim(),
        });
      }
      setEditing(null);
      await load();
      toast.success(editing === "nuevo" ? "Aparato creado." : "Aparato actualizado.");
    } catch {
      toast.error("No se pudo guardar el aparato.");
    } finally {
      setSaving(false);
    }
  }

  // Cambio optimista: el estado se toca a diario, no debe esperar a la red.
  async function onSetStatus(d: Device, status: DeviceStatus) {
    if (d.status === status) return;
    setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
    try {
      await setDeviceStatus(d.id, status);
    } catch {
      load();
      toast.error("No se pudo cambiar el estado.");
    }
  }

  function renderItem({ item }: { item: Device }) {
    const meta = STATUS_META[item.status];
    return (
      <Card>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: meta.color }]} />
          <Text style={styles.title}>{item.name}</Text>
        </View>
        <Text style={styles.meta}>
          {[item.type, clinicName(item.clinicId)].filter(Boolean).join(" · ")}
        </Text>
        <Text style={styles.meta}>{item.hours || "Sin horario"}</Text>

        <Segmented
          options={STATUS_OPTIONS}
          value={item.status}
          onChange={(s) => onSetStatus(item, s)}
          style={{ marginTop: spacing.md }}
        />

        <RowActions onEdit={() => abrir(item)} />
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
            title="Aparatos"
            onBack={back}
            subtitle="Estado de cada equipo de la clínica."
            actionLabel="+ Nuevo"
            onAction={() => abrir("nuevo")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="Sin aparatos registrados"
              message="Registra tus equipos para llevar su estado y horario."
            />
          )
        }
      />

      <FormModal
        visible={editing !== null}
        title={editing === "nuevo" ? "Nuevo aparato" : "Editar aparato"}
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Field
          label="Nombre"
          required
          value={form.name}
          onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          placeholder="Ej. Láser Alejandrita"
          error={errors.name}
          helper={
            editing !== "nuevo" ? "El nombre y el tipo no se pueden cambiar." : undefined
          }
        />
        {editing === "nuevo" ? (
          <Field
            label="Tipo"
            value={form.type}
            onChangeText={(t) => setForm((f) => ({ ...f, type: t }))}
            placeholder="Ej. Depilación"
          />
        ) : null}
        <Select
          label="Sucursal"
          options={clinics.map((c) => ({ value: c.id, label: c.name }))}
          value={clinicId}
          onChange={setClinicId}
          clearable
          empty="Primero crea una sucursal."
          helper="Tócala de nuevo para dejarla sin sucursal."
        />
        <Field
          label="Horario"
          value={form.hours}
          onChangeText={(t) => setForm((f) => ({ ...f, hours: t }))}
          placeholder="Ej. Lun–Vie 10:00–21:00"
        />
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium, flex: 1 },
  meta: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 3,
    marginLeft: 17,
    fontFamily: fonts.regular,
  },
});
