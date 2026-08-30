import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Switch,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  listTreatmentsAdmin,
  listClinics,
  createTreatment,
  updateTreatment,
  setTreatmentActive,
  deleteTreatment,
  type TreatmentInput,
} from "@/lib/admin";
import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { Button } from "@/components/form/Button";
import { FormModal } from "@/components/ui/FormModal";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, numero, esValido, type Errors } from "@/lib/validate";
import { treatmentPriceLabel } from "@/lib/types";
import type { Treatment, Clinic } from "@/lib/types";
import { colors, spacing, radius, font, fonts } from "@/theme";

type Campo = "name" | "price" | "durationMin" | "clinics";
type Filtro = "todos" | "facial" | "corporal";

const VACIO = {
  name: "",
  category: "facial" as Treatment["category"],
  price: "",
  priceMax: "",
  priceNote: "",
  durationMin: "30",
  clinicIds: [] as string[],
};

// Catálogo de tratamientos: precios, duración y en qué sucursales se ofrecen.
export function TreatmentsAdminScreen() {
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<Treatment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VACIO });
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, cs] = await Promise.all([listTreatmentsAdmin(), listClinics()]);
      setItems(ts);
      setClinics(cs);
    } catch {
      toast.error("No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (t) =>
        (filtro === "todos" || t.category === filtro) &&
        (!needle || t.name.toLowerCase().includes(needle)),
    );
  }, [items, q, filtro]);

  const nombreClinica = useCallback(
    (id: string) => clinics.find((c) => c.id === id)?.name ?? "—",
    [clinics],
  );

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...VACIO, clinicIds: clinics.map((c) => c.id) });
    setErrors({});
    setOpen(true);
  }

  function abrirEditar(t: Treatment) {
    setEditId(t.id);
    setForm({
      name: t.name,
      category: t.category,
      price: String(t.price),
      priceMax: t.priceMax ? String(t.priceMax) : "",
      priceNote: t.priceNote ?? "",
      durationMin: String(t.durationMin ?? 30),
      clinicIds: [...t.clinicIds],
    });
    setErrors({});
    setOpen(true);
  }

  function set<K extends keyof typeof VACIO>(k: K, v: (typeof VACIO)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k === "clinicIds" ? "clinics" : k]: undefined }));
  }

  async function guardar() {
    const e: Errors<Campo> = {
      name: texto(form.name, 3, "El nombre"),
      price: numero(form.price, { min: 0, campo: "El precio" }),
      durationMin: numero(form.durationMin, { min: 5, max: 600, campo: "La duración" }),
      clinics: form.clinicIds.length === 0 ? "Elige al menos una sucursal." : undefined,
    };
    if (!esValido(e)) {
      setErrors(e);
      return;
    }
    const payload: TreatmentInput = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      durationMin: Number(form.durationMin),
      clinicIds: form.clinicIds,
      ...(form.priceMax.trim() ? { priceMax: Number(form.priceMax) } : {}),
      ...(form.priceNote.trim() ? { priceNote: form.priceNote.trim() } : {}),
    };
    setSaving(true);
    try {
      if (editId) {
        await updateTreatment(editId, payload);
        toast.success("Tratamiento actualizado");
      } else {
        await createTreatment(payload);
        toast.success("Tratamiento creado");
      }
      setOpen(false);
      await load();
    } catch {
      toast.error("No se pudo guardar el tratamiento.");
    } finally {
      setSaving(false);
    }
  }

  async function alternar(t: Treatment) {
    setItems((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)),
    );
    try {
      await setTreatmentActive(t.id, !t.active);
    } catch {
      toast.error("No se pudo cambiar la visibilidad.");
      load();
    }
  }

  async function eliminar(t: Treatment) {
    const ok = await confirm({
      title: "Eliminar tratamiento",
      message: `¿Eliminar "${t.name}" del catálogo?`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTreatment(t.id);
      toast.success("Tratamiento eliminado");
      await load();
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  function renderItem({ item }: { item: Treatment }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.badge, item.category === "facial" ? styles.badgeF : styles.badgeC]}>
                <Text style={styles.badgeText}>
                  {item.category === "facial" ? "Facial" : "Corporal"}
                </Text>
              </View>
              <Text style={styles.price}>{treatmentPriceLabel(item)}</Text>
              <Text style={styles.meta}>· {item.durationMin ?? 30} min</Text>
            </View>
            <Text style={styles.clinics} numberOfLines={1}>
              {item.clinicIds.length === 0
                ? "Sin sucursales"
                : item.clinicIds.map(nombreClinica).join(" · ")}
            </Text>
          </View>
          <View style={styles.switchCol}>
            <Switch
              value={item.active}
              onValueChange={() => alternar(item)}
              trackColor={{ true: colors.gold, false: "#d8d1c4" }}
              thumbColor="#fff"
            />
            <Text style={[styles.state, { color: item.active ? colors.goldDeep : colors.muted }]}>
              {item.active ? "Visible" : "Oculto"}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => abrirEditar(item)} hitSlop={6}>
            <Text style={styles.edit}>Editar</Text>
          </Pressable>
          <Pressable onPress={() => eliminar(item)} hitSlop={6}>
            <Text style={styles.delete}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={visibles}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Tratamientos</Text>
                <Text style={styles.subtitle}>
                  {items.length} en catálogo · precios y sucursales
                </Text>
              </View>
              <Pressable style={styles.addBtn} onPress={abrirNuevo}>
                <Text style={styles.addBtnText}>+ Nuevo</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              placeholder="Buscar tratamiento…"
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />

            <View style={styles.filtros}>
              {(["todos", "facial", "corporal"] as Filtro[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFiltro(f)}
                  style={[styles.filtro, filtro === f && styles.filtroOn]}
                >
                  <Text style={[styles.filtroText, filtro === f && styles.filtroTextOn]}>
                    {f === "todos" ? "Todos" : f === "facial" ? "Faciales" : "Corporales"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
          ) : (
            <Text style={styles.empty}>
              {q ? "Sin resultados." : "Aún no hay tratamientos."}
            </Text>
          )
        }
      />

      <FormModal
        visible={open}
        title={editId ? "Editar tratamiento" : "Nuevo tratamiento"}
        subtitle="Precio, duración y en qué sucursales se ofrece."
        onClose={() => setOpen(false)}
        onSubmit={guardar}
        submitText={editId ? "Guardar cambios" : "Crear"}
        saving={saving}
      >
        <Field
          label="Nombre"
          required
          value={form.name}
          onChangeText={(v) => set("name", v)}
          placeholder="ej. Hydrafacial"
          error={errors.name}
        />
        <Select
          label="Categoría"
          required
          options={[
            { value: "facial", label: "Facial" },
            { value: "corporal", label: "Corporal" },
          ]}
          value={form.category}
          onChange={(v) => set("category", (v ?? "facial") as Treatment["category"])}
        />
        <Field
          label="Precio"
          required
          value={form.price}
          onChangeText={(v) => set("price", v)}
          keyboardType="numeric"
          prefix="$"
          placeholder="1800"
          error={errors.price}
        />
        <Field
          label="Precio máximo (opcional)"
          value={form.priceMax}
          onChangeText={(v) => set("priceMax", v)}
          keyboardType="numeric"
          prefix="$"
          placeholder="12500"
          helper="Solo si el precio es un rango."
        />
        <Field
          label="Nota de precio (opcional)"
          value={form.priceNote}
          onChangeText={(v) => set("priceNote", v)}
          placeholder="por unidad"
          helper='Se muestra junto al precio, ej. "por unidad".'
        />
        <Field
          label="Duración"
          required
          value={form.durationMin}
          onChangeText={(v) => set("durationMin", v)}
          keyboardType="numeric"
          suffix="min"
          error={errors.durationMin}
          helper="Define los horarios disponibles al agendar."
        />

        <Text style={styles.multiLabel}>
          Sucursales <Text style={{ color: colors.goldDeep }}>*</Text>
        </Text>
        <View style={styles.chipWrap}>
          {clinics.map((c) => {
            const on = form.clinicIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() =>
                  set(
                    "clinicIds",
                    on
                      ? form.clinicIds.filter((x) => x !== c.id)
                      : [...form.clinicIds, c.id],
                  )
                }
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.clinics ? <Text style={styles.err}>{errors.clinics}</Text> : null}
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { fontSize: font.size.display - 8, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  addBtn: {
    backgroundColor: colors.ground,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  addBtnText: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: font.size.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink,
    marginBottom: spacing.md, fontFamily: fonts.regular },
  filtros: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  filtro: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  filtroOn: { backgroundColor: colors.ground, borderColor: colors.ground },
  filtroText: { fontSize: font.size.sm, color: colors.textOnCard, fontFamily: fonts.medium },
  filtroTextOn: { color: colors.goldSoft, fontFamily: fonts.bold },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", gap: spacing.md },
  name: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeF: { backgroundColor: colors.rose },
  badgeC: { backgroundColor: "#dbe7f3" },
  badgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: "#4a2f28" },
  price: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.bold },
  meta: { fontSize: font.size.sm, color: colors.muted, fontFamily: fonts.regular },
  clinics: { fontSize: font.size.xs, color: colors.subtleOnCard, marginTop: 4, fontFamily: fonts.regular },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  edit: { color: colors.goldDeep, fontSize: font.size.sm, fontFamily: fonts.bold },
  delete: { color: colors.danger, fontSize: font.size.sm, fontFamily: fonts.semibold },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
  multiLabel: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: fonts.bold,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: colors.ground, borderColor: colors.ground },
  chipText: { fontSize: font.size.sm, color: colors.textOnCard, fontFamily: fonts.medium },
  chipTextOn: { color: colors.goldSoft, fontFamily: fonts.bold },
  err: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.semibold },
});
