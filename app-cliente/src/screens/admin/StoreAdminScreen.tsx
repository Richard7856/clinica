import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch } from "react-native";
import {
  listStoreProducts,
  createStoreProduct,
  updateStoreProduct,
  setStoreProductActive,
  deleteStoreProduct,
} from "@/lib/admin";
import { ScreenHeader, Card, EmptyState, Loader } from "@/components/ui/Screen";
import { RowActions, Pill } from "@/components/ui/Controls";
import { FormModal } from "@/components/ui/FormModal";
import { Field } from "@/components/form/Field";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { texto, numero, esValido, type Errors } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";
import type { StoreProduct } from "@/lib/types";

type Campo = "name" | "price" | "stock";
const VACIO = { name: "", description: "", price: "", stock: "" };

// Panel admin: productos físicos de la tienda.
export function StoreAdminScreen() {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StoreProduct | "nuevo" | null>(null);
  const [form, setForm] = useState(VACIO);
  const [errors, setErrors] = useState<Errors<Campo>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setItems(await listStoreProducts());
    } catch {
      setItems([]);
      toast.error("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function abrir(p: StoreProduct | "nuevo") {
    setEditing(p);
    setErrors({});
    setForm(
      p === "nuevo"
        ? VACIO
        : {
            name: p.name,
            description: p.description,
            price: String(p.price),
            stock: p.stock === undefined ? "" : String(p.stock),
          },
    );
  }

  async function onSubmit() {
    const e: Errors<Campo> = {
      name: texto(form.name, 2, "El nombre"),
      price: numero(form.price, { min: 0, campo: "El precio" }),
      // El stock es opcional: vacío significa "sin control de inventario".
      stock: form.stock.trim() ? numero(form.stock, { min: 0, campo: "El stock" }) : undefined,
    };
    setErrors(e);
    if (!esValido(e)) return;

    setSaving(true);
    try {
      const datos = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: form.stock.trim() ? Number(form.stock) : undefined,
      };
      if (editing === "nuevo") await createStoreProduct(datos);
      else if (editing) await updateStoreProduct(editing.id, datos);
      setEditing(null);
      await load();
      toast.success(editing === "nuevo" ? "Producto creado." : "Producto actualizado.");
    } catch {
      toast.error("No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(p: StoreProduct) {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    try {
      await setStoreProductActive(p.id, !p.active);
    } catch {
      load();
      toast.error("No se pudo cambiar la visibilidad.");
    }
  }

  async function onDelete(p: StoreProduct) {
    const ok = await confirm({
      title: "Eliminar producto",
      message: `«${p.name}» desaparecerá de la tienda. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteStoreProduct(p.id);
      await load();
      toast.success("Producto eliminado.");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  function renderItem({ item }: { item: StoreProduct }) {
    const agotado = typeof item.stock === "number" && item.stock <= 0;
    return (
      <Card>
        <View style={styles.top}>
          <View style={styles.info}>
            <Text style={styles.title}>{item.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${item.price.toLocaleString("es-MX")}</Text>
              {typeof item.stock === "number" ? (
                <Pill
                  label={agotado ? "Agotado" : `${item.stock} en stock`}
                  color={agotado ? colors.danger : colors.ok}
                />
              ) : null}
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
              {item.active ? "Visible" : "Oculto"}
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
            title="Tienda"
            subtitle="Productos que ve y compra el cliente."
            actionLabel="+ Nuevo"
            onAction={() => abrir("nuevo")}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="La tienda está vacía"
              message="Agrega tu primer producto para que aparezca en la app."
            />
          )
        }
      />

      <FormModal
        visible={editing !== null}
        title={editing === "nuevo" ? "Nuevo producto" : "Editar producto"}
        onClose={() => setEditing(null)}
        onSubmit={onSubmit}
        saving={saving}
      >
        <Field
          label="Nombre"
          required
          value={form.name}
          onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          placeholder="Ej. Serum vitamina C"
          error={errors.name}
        />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
          placeholder="Ej. 30 ml, uso diario por la mañana"
          multiline
        />
        <Field
          label="Precio"
          required
          value={form.price}
          onChangeText={(t) => setForm((f) => ({ ...f, price: t }))}
          placeholder="890"
          keyboardType="numeric"
          prefix="$"
          error={errors.price}
        />
        <Field
          label="Stock"
          value={form.stock}
          onChangeText={(t) => setForm((f) => ({ ...f, stock: t }))}
          placeholder="12"
          keyboardType="numeric"
          error={errors.stock}
          helper="Déjalo vacío si no llevas control de inventario."
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
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  price: { fontSize: font.size.lg, color: colors.goldDeep, fontFamily: fonts.extrabold },
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
