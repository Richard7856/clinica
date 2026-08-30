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
  listPromotions,
  createPromotion,
  setPromotionActive,
  deletePromotion,
} from "@/lib/admin";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Promotion } from "@/lib/types";

// Panel admin: control de promociones. Crear, activar/desactivar y eliminar.
// Lo que se active aquí es lo que ve el cliente en su app.
export function PromotionsAdminScreen() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [badge, setBadge] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPromotions());
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
    if (title.trim().length < 3) {
      Alert.alert("Falta título", "Escribe un título para la promoción.");
      return;
    }
    setSaving(true);
    try {
      await createPromotion({
        title: title.trim(),
        description: desc.trim(),
        badge: badge.trim(),
      });
      setTitle("");
      setDesc("");
      setBadge("");
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo crear la promoción.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(p: Promotion) {
    setItems((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
    );
    try {
      await setPromotionActive(p.id, !p.active);
    } catch {
      load(); // revertir si falla
    }
  }

  function onDelete(p: Promotion) {
    Alert.alert("Eliminar", `¿Eliminar "${p.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deletePromotion(p.id);
          load();
        },
      },
    ]);
  }

  function renderItem({ item }: { item: Promotion }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>
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
          <Text style={[styles.state, { color: item.active ? colors.goldDeep : colors.muted }]}>
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
                <Text style={styles.title}>Promociones</Text>
                <Text style={styles.subtitle}>
                  Lo que actives aquí lo ve el cliente.
                </Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowForm((s) => !s)}
              >
                <Text style={styles.addBtnText}>{showForm ? "✕" : "+ Nueva"}</Text>
              </Pressable>
            </View>

            {showForm && (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Título (ej. 2x1 Botox)"
                  placeholderTextColor={colors.muted}
                  value={title}
                  onChangeText={setTitle}
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
                  placeholder="Etiqueta corta (ej. 2x1, GRATIS)"
                  placeholderTextColor={colors.muted}
                  value={badge}
                  onChangeText={setBadge}
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Guardando…" : "Crear promoción"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
          ) : (
            <Text style={styles.empty}>Aún no hay promociones. Crea la primera.</Text>
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    backgroundColor: colors.rose,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: "#7a4a40" },
  cardTitle: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium, flexShrink: 1 },
  cardDesc: { fontSize: font.size.sm, color: colors.subtleOnCard, marginTop: 4, lineHeight: 18, fontFamily: fonts.regular },
  delete: { color: colors.danger, fontSize: font.size.xs, marginTop: spacing.sm, fontFamily: fonts.semibold },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontFamily: fonts.bold },
  empty: { textAlign: "center", color: colors.muted, fontSize: font.size.md, marginTop: spacing.xxl, fontFamily: fonts.regular },
});
