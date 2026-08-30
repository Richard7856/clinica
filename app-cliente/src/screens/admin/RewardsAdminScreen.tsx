import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch } from "react-native";
import {
  listRewardItems,
  createRewardItem,
  updateRewardItem,
  setRewardItemActive,
  deleteRewardItem,
} from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader, useBack } from "@/components/ui/Screen";
import { RowActions } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { Swan } from "@/components/Swan";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, numero, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";
import type { RewardItem } from "@/lib/types";

type Campo = "title" | "cost";
const VACIO = { title: "", description: "", cost: "" };

// Panel admin: catálogo canjeable por Cisnes.
export function RewardsAdminScreen() {
  const back = useBack();
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RewardItem | "nueva" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setItems((await listRewardItems()).sort((a, b) => a.cost - b.cost));
    } catch {
      setItems([]);
      toast.error("No se pudieron cargar las recompensas.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function abrir(r: RewardItem | "nueva") {
    setEditing(r);
    setErrors({});
    setForm(
      r === "nueva"
        ? VACIO
        : { title: r.title, description: r.description, cost: String(r.cost) },
    );
  }

  async function onSubmit() {
    const e: Errors<Campo> = {
      title: texto(form.title, 3, "El título"),
      cost: numero(form.cost, { min: 1, campo: "El costo" }),
    };
    setErrors(e);
    if (!esValido(e)) return;

    setSaving(true);
    try {
      const datos = {
        title: form.title.trim(),
        description: form.description.trim(),
        cost: Number(form.cost),
      };
      if (editing === "nueva") await createRewardItem(datos);
      else if (editing) await updateRewardItem(editing.id, datos);
      setEditing(null);
      await load();
      toast.success(editing === "nueva" ? "Recompensa creada." : "Recompensa actualizada.");
    } catch {
      toast.error("No se pudo guardar la recompensa.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(r: RewardItem) {
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    try {
      await setRewardItemActive(r.id, !r.active);
    } catch {
      load();
      toast.error("No se pudo cambiar la visibilidad.");
    }
  }

  async function onDelete(r: RewardItem) {
    const ok = await confirm({
      title: "Eliminar recompensa",
      message: `«${r.title}» dejará de poder canjearse. Los canjes ya hechos no se ven afectados.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRewardItem(r.id);
      await load();
      toast.success("Recompensa eliminada.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  function renderItem({ item }: { item: RewardItem }) {
    return (
      <Card>
        <View style={styles.top}>
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.costRow}>
              <Swan size={14} color={colors.goldDeep} />
              <Text style={styles.cost}>{item.cost}</Text>
              <Text style={styles.costUnit}>Cisnes</Text>
            </View>
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
              style={[styles.state, { color: item.active ? colors.goldDeep : colors.muted }]}
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
            title="Recompensas"
            onBack={back}
            subtitle="Catálogo que ven los clientes."
            actionLabel="+ Nueva"
            onAction={() => abrir("nueva")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="Sin recompensas"
              message="Crea la primera para que tus clientas tengan por qué juntar Cisnes."
            />
          )
        }
      />

      <FormModal
        visible={editing !== null}
        title={editing === "nueva" ? "Nueva recompensa" : "Editar recompensa"}
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Field
          label="Título"
          required
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
          placeholder="Ej. Limpieza facial de cortesía"
          error={errors.title}
        />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
          placeholder="Ej. Una limpieza profunda completa"
          multiline
        />
        <Field
          label="Costo"
          required
          value={form.cost}
          onChangeText={(t) => setForm((f) => ({ ...f, cost: t }))}
          placeholder="80"
          keyboardType="numeric"
          suffix="Cisnes"
          error={errors.cost}
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
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  costRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  cost: { fontSize: font.size.lg, color: colors.goldDeep, fontFamily: fonts.extrabold },
  costUnit: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.semibold },
  desc: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 6,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
});
