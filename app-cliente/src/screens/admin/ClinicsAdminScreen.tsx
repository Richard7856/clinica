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
} from "react-native";
import { listClinics, createClinic, deleteClinic } from "@/lib/admin";
import { colors, spacing, radius, font } from "@/theme";
import type { Clinic } from "@/lib/types";

// Panel admin: sucursales de la clínica. Crear y eliminar.
// Los aparatos y citas se etiquetan con el id de la clínica.
export function ClinicsAdminScreen() {
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listClinics());
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
      Alert.alert("Falta nombre", "Escribe un nombre para la clínica.");
      return;
    }
    setSaving(true);
    try {
      await createClinic({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      setName("");
      setAddress("");
      setPhone("");
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo crear la clínica.");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(c: Clinic) {
    Alert.alert("Eliminar", `¿Eliminar "${c.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteClinic(c.id);
          load();
        },
      },
    ]);
  }

  function renderItem({ item }: { item: Clinic }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.meta}>{item.address}</Text>
          ) : null}
          {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
          <Pressable onPress={() => onDelete(item)} hitSlop={8}>
            <Text style={styles.delete}>Eliminar</Text>
          </Pressable>
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
                <Text style={styles.title}>Clínicas</Text>
                <Text style={styles.subtitle}>Tus sucursales.</Text>
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
                  placeholder="Nombre (ej. Sucursal Centro)"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Dirección"
                  placeholderTextColor={colors.muted}
                  value={address}
                  onChangeText={setAddress}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Guardando…" : "Crear clínica"}
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
            <Text style={styles.empty}>Agrega tu primera clínica.</Text>
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
  meta: { fontSize: font.size.sm, color: colors.muted, marginTop: 4 },
  delete: {
    color: colors.danger,
    fontSize: font.size.xs,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
