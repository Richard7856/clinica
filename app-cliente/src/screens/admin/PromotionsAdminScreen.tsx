import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch } from "react-native";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion,
} from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader } from "@/components/ui/Screen";
import { RowActions } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Promotion } from "@/lib/types";

type Campo = "title" | "description" | "badge";
const VACIO = { title: "", description: "", badge: "" };

// Panel admin: promociones. Lo que se active aquí es lo que ve el cliente.
export function PromotionsAdminScreen() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | "nueva" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setItems(await listPromotions());
    } catch {
      setItems([]);
      toast.error("No se pudieron cargar las promociones.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function abrir(p: Promotion | "nueva") {
    setEditing(p);
    setErrors({});
    setForm(
      p === "nueva"
        ? VACIO
        : { title: p.title, description: p.description, badge: p.badge ?? "" },
    );
  }

  async function onSubmit() {
    const e: Errors<Campo> = { title: texto(form.title, 3, "El título") };
    setErrors(e);
    if (!esValido(e)) return;

    setSaving(true);
    try {
      const datos = {
        title: form.title.trim(),
        description: form.description.trim(),
        badge: form.badge.trim(),
      };
      if (editing === "nueva") await createPromotion(datos);
      else if (editing) await updatePromotion(editing.id, datos);
      setEditing(null);
      await load();
      toast.success(editing === "nueva" ? "Promoción creada." : "Promoción actualizada.");
    } catch {
      toast.error("No se pudo guardar la promoción.");
    } finally {
      setSaving(false);
    }
  }

  // Cambio optimista: el interruptor responde de inmediato y si falla revierte.
  async function onToggle(p: Promotion) {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    try {
      await setPromotionActive(p.id, !p.active);
    } catch {
      load();
      toast.error("No se pudo cambiar la visibilidad.");
    }
  }

  async function onDelete(p: Promotion) {
    const ok = await confirm({
      title: "Eliminar promoción",
      message: `«${p.title}» dejará de verse en la app. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePromotion(p.id);
      await load();
      toast.success("Promoción eliminada.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  function renderItem({ item }: { item: Promotion }) {
    return (
      <Card>
        <View style={styles.top}>
          <View style={styles.info}>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.desc}>{item.description}</Text>
            ) : null}
          </View>
          <View style={styles.switchCol}>
            <Switch
              value={item.active}
              onValueChange={() => onToggle(item)}
              trackColor={{ true: colors.gold, false: "#d8d1c4" }}
              thumbColor="#fff"
            />
            <Text
              style={[
                styles.state,
                { color: item.active ? colors.goldDeep : colors.muted },
              ]}
            >
              {item.active ? "Visible" : "Oculta"}
            </Text>
          </View>
        </View>
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
            title="Promociones"
            subtitle="Lo que actives aquí lo ve el cliente."
            actionLabel="+ Nueva"
            onAction={() => abrir("nueva")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="Todavía no hay promociones"
              message="Crea la primera y aparecerá en el inicio de tus clientas."
            />
          )
        }
      />

      <FormModal
        visible={editing !== null}
        title={editing === "nueva" ? "Nueva promoción" : "Editar promoción"}
        subtitle="Aparece en el carrusel del inicio."
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Field
          label="Título"
          required
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          placeholder="Ej. Botox zona frontal"
          error={errors.title}
        />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
          placeholder="Ej. Dos zonas al precio de una durante agosto"
          multiline
        />
        <Field
          label="Etiqueta"
          value={form.badge}
          onChangeText={(t) => setForm((f) => ({ ...f, badge: t }))}
          placeholder="Ej. 2X1"
          helper="Texto corto que se ve como sello sobre la promoción."
        />
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  top: { flexDirection: "row", gap: spacing.md },
  info: { flex: 1 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: "#7a4a40", letterSpacing: 0.5 },
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  desc: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
});
