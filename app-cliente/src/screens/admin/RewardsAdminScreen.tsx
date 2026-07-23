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
  listRewardItems,
  createRewardItem,
  setRewardItemActive,
} from "@/lib/admin";
import { colors, spacing, radius, font } from "@/theme";
import { Swan } from "@/components/Swan";
import type { RewardItem } from "@/lib/types";

// Panel admin: catálogo de recompensas canjeables con Cisnes.
// Lo que se marca visible aquí es lo que ve el cliente.
export function RewardsAdminScreen() {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listRewardItems());
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
      Alert.alert("Falta título", "Escribe un título para la recompensa.");
      return;
    }
    const costNum = Number(cost);
    if (!(costNum > 0)) {
      Alert.alert("Costo inválido", "El costo en Cisnes debe ser mayor a 0.");
      return;
    }
    setSaving(true);
    try {
      await createRewardItem({
        title: title.trim(),
        description: desc.trim(),
        cost: costNum,
      });
      setTitle("");
      setDesc("");
      setCost("");
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo crear la recompensa.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(r: RewardItem) {
    setItems((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)),
    );
    try {
      await setRewardItemActive(r.id, !r.active);
    } catch {
      load(); // revertir si falla
    }
  }

  function renderItem({ item }: { item: RewardItem }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.costRow}>
            <Swan size={14} color={colors.goldDeep} />
            <Text style={styles.cost}>{item.cost} Cisnes</Text>
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>
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
                <Text style={styles.title}>Recompensas</Text>
                <Text style={styles.subtitle}>
                  Catálogo que ven los clientes.
                </Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => setShowForm((s) => !s)}
              >
                <Text style={styles.addBtnText}>
                  {showForm ? "✕" : "+ Nueva"}
                </Text>
              </Pressable>
            </View>

            {showForm && (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Título (ej. Facial express)"
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
                  placeholder="Costo en Cisnes (ej. 50)"
                  placeholderTextColor={colors.muted}
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="numeric"
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Guardando…" : "Crear recompensa"}
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
            <Text style={styles.empty}>
              Aún no hay recompensas. Crea la primera.
            </Text>
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
  title: { fontSize: font.size.display - 8, fontWeight: "300", color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.ground,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  addBtnText: { color: colors.goldSoft, fontWeight: "700", fontSize: font.size.sm },
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
    color: colors.ink,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: "#231b06", fontWeight: "700", fontSize: font.size.md },
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
    fontWeight: "500",
    flexShrink: 1,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4,
  },
  cost: { fontSize: font.size.sm, color: colors.goldDeep, fontWeight: "700" },
  cardDesc: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: 4,
    lineHeight: 18,
  },
  switchCol: { alignItems: "center", gap: 4 },
  state: { fontSize: 10, fontWeight: "700" },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
