import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { listClinics, createClinic, updateClinic, deleteClinic } from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader, useBack } from "@/components/ui/Screen";
import { RowActions } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";
import type { Clinic } from "@/lib/types";

type Campo = "name";
const VACIO = { name: "", address: "", phone: "" };

// Panel admin: sucursales. Los aparatos, tratamientos y citas se etiquetan con
// el id de la clínica, por eso eliminar una no es inocuo.
export function ClinicsAdminScreen() {
  const back = useBack();
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Clinic | "nueva" | null>(null);
  const [form, setForm] = useState(VACIO);
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

  function renderItem({ item }: { item: Clinic }) {
    return (
      <Card>
        <Text style={styles.title}>{item.name}</Text>
        {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
        {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
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
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  meta: { fontSize: font.size.sm, color: colors.muted, marginTop: 4, fontFamily: fonts.regular },
});
