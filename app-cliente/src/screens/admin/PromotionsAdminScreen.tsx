import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch, Pressable } from "react-native";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion,
  type PromotionInput,
} from "@/lib/admin";
import { listTreatments, listClinics, nombrePorId, motivoFallo } from "@/lib/catalog";
import { ScreenHeader, Card, EmptyState, Loader } from "@/components/ui/Screen";
import { RowActions } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { Select } from "@/components/form/Select";
import { Picker } from "@/components/form/Picker";
import { MultiSelect } from "@/components/form/MultiSelect";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, numero, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, radius, font, fonts } from "@/theme";
import {
  PROMO_TIPO_LABEL,
  promoBadge,
  promoBeneficio,
  promoCondiciones,
  promoVigente,
  type Promotion,
  type PromotionType,
  type PromotionScope,
  type Clinic,
  type Treatment,
} from "@/lib/types";

type Campo = "title" | "valor" | "alcance";

const TIPOS = (Object.keys(PROMO_TIPO_LABEL) as PromotionType[]).map((t) => ({
  value: t,
  label: PROMO_TIPO_LABEL[t],
}));

const ALCANCES: { value: PromotionScope; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "treatments", label: "Tratamientos" },
  { value: "category", label: "Categoría" },
  { value: "store", label: "Tienda" },
];

// Vigencia por duraciones y no por fecha exacta: una clínica piensa en "la
// promo de este mes", no en un calendario. La fecha se calcula al guardar.
const VIGENCIAS = [
  { value: "", label: "Sin vencimiento" },
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "fin_mes", label: "Fin de mes" },
];

const VACIO = {
  type: "percent" as PromotionType,
  title: "",
  description: "",
  badge: "",
  percent: "",
  amount: "",
  buyQty: "2",
  payQty: "1",
  giftText: "",
  multiplier: "2",
  scope: "all" as PromotionScope,
  treatmentIds: [] as string[],
  category: "facial" as "facial" | "corporal",
  clinicIds: [] as string[],
  minSpend: "",
  vigencia: "",
  newClientsOnly: false,
};

function fechaFin(vigencia: string): string | undefined {
  if (!vigencia) return undefined;
  const d = new Date();
  if (vigencia === "fin_mes") {
    d.setMonth(d.getMonth() + 1, 0);
  } else {
    d.setDate(d.getDate() + Number(vigencia));
  }
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

// Panel admin: promociones. Lo que se active aquí es lo que ve el cliente.
export function PromotionsAdminScreen() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallos, setFallos] = useState<{ treatments?: string; clinics?: string }>({});
  const [editing, setEditing] = useState<Promotion | "nueva" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Cada lectura corre por su cuenta: si una colección está denegada, las
  // otras se siguen mostrando y el formulario dice cuál falló en vez de
  // fingir que el catálogo está vacío.
  const load = useCallback(async () => {
    const [proms, treats, cls] = await Promise.allSettled([
      listPromotions(),
      listTreatments(),
      listClinics(),
    ]);

    if (proms.status === "fulfilled") setItems(proms.value);
    else {
      setItems([]);
      toast.error(`Promociones: ${motivoFallo(proms.reason)}`);
    }
    setTreatments(treats.status === "fulfilled" ? treats.value : []);
    setClinics(cls.status === "fulfilled" ? cls.value : []);
    setFallos({
      treatments: treats.status === "rejected" ? motivoFallo(treats.reason) : undefined,
      clinics: cls.status === "rejected" ? motivoFallo(cls.reason) : undefined,
    });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Promoción "de mentira" con lo que lleva el formulario, solo para mostrar
  // en vivo qué sello se va a generar.
  const previa = useMemo<Promotion>(
    () => ({
      id: "",
      active: true,
      type: form.type,
      title: form.title,
      description: form.description,
      badge: "",
      percent: Number(form.percent) || undefined,
      amount: Number(form.amount) || undefined,
      buyQty: Number(form.buyQty) || undefined,
      payQty: Number(form.payQty) || undefined,
      giftText: form.giftText,
      multiplier: Number(form.multiplier) || undefined,
      scope: form.scope,
    }),
    [form],
  );

  const nombres = useMemo(
    () => ({
      tratamientos: nombrePorId(treatments),
      clinicas: nombrePorId(clinics),
    }),
    [treatments, clinics],
  );

  function set<K extends keyof typeof VACIO>(k: K, v: (typeof VACIO)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function abrir(p: Promotion | "nueva") {
    setEditing(p);
    setErrors({});
    if (p === "nueva") {
      setForm(VACIO);
      return;
    }
    setForm({
      type: p.type,
      title: p.title,
      description: p.description,
      badge: p.badge ?? "",
      percent: p.percent ? String(p.percent) : "",
      amount: p.amount ? String(p.amount) : "",
      buyQty: String(p.buyQty ?? 2),
      payQty: String(p.payQty ?? 1),
      giftText: p.giftText ?? "",
      multiplier: String(p.multiplier ?? 2),
      scope: p.scope,
      treatmentIds: [...(p.treatmentIds ?? [])],
      category: p.category ?? "facial",
      clinicIds: [...(p.clinicIds ?? [])],
      minSpend: p.minSpend ? String(p.minSpend) : "",
      // La vigencia guardada es una fecha; al reeditar se parte de "sin
      // vencimiento" y solo se cambia si el admin elige otra duración.
      vigencia: "",
      newClientsOnly: Boolean(p.newClientsOnly),
    });
  }

  // Cada tipo pide su propio dato; validamos solo el que aplica.
  function validarValor(): string | undefined {
    switch (form.type) {
      case "percent":
        return numero(form.percent, { min: 1, max: 100, campo: "El porcentaje" });
      case "amount":
        return numero(form.amount, { min: 1, campo: "El descuento" });
      case "fixed_price":
        return numero(form.amount, { min: 1, campo: "El precio" });
      case "nxm": {
        const llevas = numero(form.buyQty, { min: 2, campo: "Lo que se lleva" });
        if (llevas) return llevas;
        const pagas = numero(form.payQty, { min: 1, campo: "Lo que se paga" });
        if (pagas) return pagas;
        return Number(form.payQty) >= Number(form.buyQty)
          ? "Debe pagar menos de lo que se lleva."
          : undefined;
      }
      case "gift":
        return texto(form.giftText, 3, "El regalo");
      case "points":
        return numero(form.multiplier, { min: 2, max: 10, campo: "El multiplicador" });
      default:
        return undefined;
    }
  }

  async function onSubmit() {
    const e: Errors<Campo> = {
      title: texto(form.title, 3, "El título"),
      valor: validarValor(),
      alcance:
        form.scope === "treatments" && form.treatmentIds.length === 0
          ? "Elige al menos un tratamiento."
          : undefined,
    };
    setErrors(e);
    if (!esValido(e)) return;

    const datos: PromotionInput = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      badge: form.badge.trim(),
      percent: form.percent ? Number(form.percent) : undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      buyQty: Number(form.buyQty),
      payQty: Number(form.payQty),
      giftText: form.giftText.trim(),
      multiplier: Number(form.multiplier),
      scope: form.scope,
      treatmentIds: form.treatmentIds,
      category: form.category,
      clinicIds: form.clinicIds,
      minSpend: form.minSpend ? Number(form.minSpend) : undefined,
      endsAt: fechaFin(form.vigencia) ?? (editing !== "nueva" ? editing?.endsAt : undefined),
      newClientsOnly: form.newClientsOnly,
    };

    setSaving(true);
    try {
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
    const badge = promoBadge(item);
    const vencida = !promoVigente(item);
    const condiciones = promoCondiciones(item, nombres);
    return (
      <Card>
        <View style={styles.top}>
          <View style={styles.info}>
            <View style={styles.badgeRow}>
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
              {vencida ? (
                <View style={styles.vencida}>
                  <Text style={styles.vencidaText}>VENCIDA</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.beneficio}>
              {item.description || promoBeneficio(item)}
            </Text>
            {condiciones.map((c) => (
              <Text key={c} style={styles.condicion}>
                · {c}
              </Text>
            ))}
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
        subtitle="Elige qué da, sobre qué aplica y hasta cuándo."
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Picker
          label="Tipo de promoción"
          required
          title="¿Qué da la promoción?"
          options={TIPOS}
          value={form.type}
          onChange={(v) => set("type", (v as PromotionType) ?? "percent")}
        />

        {/* Valor: solo el campo que corresponde al tipo elegido */}
        {form.type === "percent" && (
          <Field
            label="Porcentaje de descuento"
            required
            value={form.percent}
            onChangeText={(t) => set("percent", t)}
            placeholder="20"
            keyboardType="numeric"
            suffix="%"
            error={errors.valor}
          />
        )}
        {form.type === "amount" && (
          <Field
            label="Descuento"
            required
            value={form.amount}
            onChangeText={(t) => set("amount", t)}
            placeholder="500"
            keyboardType="numeric"
            prefix="$"
            error={errors.valor}
          />
        )}
        {form.type === "fixed_price" && (
          <Field
            label="Precio especial"
            required
            value={form.amount}
            onChangeText={(t) => set("amount", t)}
            placeholder="1200"
            keyboardType="numeric"
            prefix="$"
            error={errors.valor}
            helper="El precio final que pagará la clienta."
          />
        )}
        {form.type === "nxm" && (
          <View style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Field
                label="Se lleva"
                required
                value={form.buyQty}
                onChangeText={(t) => set("buyQty", t)}
                placeholder="2"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Paga"
                required
                value={form.payQty}
                onChangeText={(t) => set("payQty", t)}
                placeholder="1"
                keyboardType="numeric"
                error={errors.valor}
              />
            </View>
          </View>
        )}
        {form.type === "gift" && (
          <Field
            label="Qué se regala"
            required
            value={form.giftText}
            onChangeText={(t) => set("giftText", t)}
            placeholder="Limpieza facial de cortesía"
            error={errors.valor}
          />
        )}
        {form.type === "points" && (
          <Field
            label="Multiplicador de Cisnes"
            required
            value={form.multiplier}
            onChangeText={(t) => set("multiplier", t)}
            placeholder="2"
            keyboardType="numeric"
            suffix="×"
            error={errors.valor}
            helper="2 = doble Cisnes durante la promoción."
          />
        )}

        <Field
          label="Título"
          required
          value={form.title}
          onChangeText={(t) => set("title", t)}
          placeholder="Ej. Botox zona frontal"
          error={errors.title}
        />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(t) => set("description", t)}
          placeholder="Déjalo vacío y se escribe solo con el tipo y el valor."
          multiline
        />

        <Select
          label="Aplica en"
          required
          options={ALCANCES}
          value={form.scope}
          onChange={(v) => set("scope", (v as PromotionScope) ?? "all")}
        />
        {form.scope === "treatments" && (
          <MultiSelect
            label="Tratamientos"
            required
            options={treatments.map((t) => ({ value: t.id, label: t.name }))}
            values={form.treatmentIds}
            onChange={(v) => set("treatmentIds", v)}
            error={errors.alcance ?? fallos.treatments}
            empty={fallos.treatments ?? "Primero crea tratamientos en el catálogo."}
          />
        )}
        {form.scope === "category" && (
          <Select
            label="Categoría"
            required
            options={[
              { value: "facial", label: "Faciales" },
              { value: "corporal", label: "Corporales" },
            ]}
            value={form.category}
            onChange={(v) => set("category", (v as "facial" | "corporal") ?? "facial")}
          />
        )}

        <MultiSelect
          label="Sucursales"
          options={clinics.map((c) => ({ value: c.id, label: c.name }))}
          values={form.clinicIds}
          onChange={(v) => set("clinicIds", v)}
          error={fallos.clinics}
          empty={fallos.clinics ?? "Aún no hay sucursales registradas."}
          helper="Déjalo vacío para que aplique en todas."
        />

        <Field
          label="Gasto mínimo"
          value={form.minSpend}
          onChangeText={(t) => set("minSpend", t)}
          placeholder="Sin mínimo"
          keyboardType="numeric"
          prefix="$"
        />

        <Select
          label="Vigencia"
          options={VIGENCIAS}
          value={form.vigencia}
          onChange={(v) => set("vigencia", v ?? "")}
          helper={
            editing !== "nueva" && editing?.endsAt
              ? "Ya tiene vencimiento; elige una duración solo si quieres cambiarlo."
              : "Al vencer deja de verse en la app, sin que la apagues a mano."
          }
        />

        <Pressable
          style={styles.switchRow}
          onPress={() => set("newClientsOnly", !form.newClientsOnly)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Solo clientas nuevas</Text>
            <Text style={styles.switchHelp}>Para promociones de primera visita.</Text>
          </View>
          <Switch
            value={form.newClientsOnly}
            onValueChange={(v) => set("newClientsOnly", v)}
            trackColor={{ true: colors.gold, false: "#d8d1c4" }}
            thumbColor="#fff"
          />
        </Pressable>

        <Field
          label="Etiqueta"
          value={form.badge}
          onChangeText={(t) => set("badge", t)}
          placeholder={promoBadge(previa) || "Ej. 2X1"}
          helper="Se calcula sola; escribe algo solo si quieres otra."
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
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: 6 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: "#7a4a40", letterSpacing: 0.5 },
  vencida: {
    alignSelf: "flex-start",
    backgroundColor: "#e6e2d8",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vencidaText: { fontSize: 10, fontFamily: fonts.extrabold, color: colors.subtleOnCard },
  title: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  beneficio: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  condicion: {
    fontSize: font.size.xs,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 16,
    fontFamily: fonts.regular,
  },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
  fila: { flexDirection: "row", gap: spacing.md },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardLine,
  },
  switchLabel: { fontSize: font.size.md, color: colors.textOnCard, fontFamily: fonts.medium },
  switchHelp: { fontSize: font.size.xs, color: colors.muted, fontFamily: fonts.regular, marginTop: 1 },
});
