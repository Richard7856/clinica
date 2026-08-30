import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import {
  listStoreProducts,
  createStoreProduct,
  setStoreProductActive,
  deleteStoreProduct,
} from "@/lib/admin";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { StoreProduct } from "@/lib/types";

// Panel admin: tienda de productos físicos. Crear, mostrar/ocultar y eliminar.
// Lo que esté "Visible" es lo que ve y compra el cliente en su app.
export function StoreAdminScreen() {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listStoreProducts());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate() {
    if (name.trim().length < 2) {
      Alert.alert("Falta nombre", "Escribe un nombre para el producto.");
      return;
    }
    const priceNum = Number(price);
    if (!(priceNum > 0)) {
      Alert.alert("Precio inválido", "El precio debe ser mayor a 0.");
      return;
    }
    // Stock es opcional: solo lo incluimos si es un número válido.
    const stockNum = Number(stock);
    const hasStock = stock.trim().length > 0 && Number.isFinite(stockNum);
    setSaving(true);
    try {
      await createStoreProduct({
        name: name.trim(),
        description: desc.trim(),
        price: priceNum,
        ...(hasStock ? { stock: stockNum } : {}),
      });
      setName("");
      setDesc("");
      setPrice("");
      setStock("");
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  // Actualización optimista del toggle; si falla, recargamos.
  async function onToggle(p: StoreProduct) {
    setItems((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
    );
    try {
      await setStoreProductActive(p.id, !p.active);
    } catch {
      load(); // revertir si falla
    }
  }

  function onDelete(p: StoreProduct) {
    Alert.alert("Eliminar", `¿Eliminar "${p.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteStoreProduct(p.id);
          load();
        },
      },
    ]);
  }

  function renderItem({ item }: { item: StoreProduct }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>
              ${item.price.toLocaleString("es-MX")}
            </Text>
            {typeof item.stock === "number" ? (
              <Text style={styles.stock}>Stock: {item.stock}</Text>
            ) : null}
          </View>
          {item.description ? (
            <Text style={styles.cardDesc}>{item.description}</Text>
          ) : null}
          <Pressable onPress={() => onDelete(item)} hitSlop={8}>
            <Text style={styles.delete}>Eliminar</Text>
          </Pressable>
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
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Tienda</Text>
                <Text style={styles.subtitle}>
                  Productos que ve y compra el cliente.
                </Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowForm((s) => !s)}
              >
                <Text style={styles.addBtnText}>
                  {showForm ? "✕" : "+ Nuevo"}
                </Text>
              </Pressable>
            </View>

            {showForm && (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre (ej. Sérum facial)"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Descripción"
                  placeholderTextColor={colors.muted}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Precio (MXN)"
                  placeholderTextColor={colors.muted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Stock (opcional)"
                  placeholderTextColor={colors.muted}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Guardando…" : "Crear producto"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>Aún no hay productos.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  form: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink, fontFamily: fonts.regular },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: "#231b06", fontFamily: fonts.bold, fontSize: font.size.md },
  card: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  price: { fontSize: font.size.md, color: colors.goldDeep, fontFamily: fonts.bold },
  stock: { fontSize: font.size.sm, color: colors.muted, fontFamily: fonts.regular },
  cardDesc: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 4,
    lineHeight: 18, fontFamily: fonts.regular },
  delete: {
    color: colors.danger,
    fontSize: font.size.xs,
    marginTop: spacing.sm,
    fontFamily: fonts.semibold,
  },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
