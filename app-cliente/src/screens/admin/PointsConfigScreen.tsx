import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { getClinicSettings, savePointsConfig } from "@/lib/admin";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Umbrales de gasto seleccionables (en pesos).
const THRESHOLDS: number[] = [100, 1000];

// Panel admin: cuántos Cisnes gana el cliente por su gasto.
// Config guardada en settings/clinic (pointsThreshold + cisnesPerThreshold).
export function PointsConfigScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(100);
  const [cisnes, setCisnes] = useState<string>("10");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getClinicSettings();
      setThreshold(cfg?.pointsThreshold && cfg.pointsThreshold > 0 ? cfg.pointsThreshold : 100);
      setCisnes(String(cfg?.cisnesPerThreshold && cfg.cisnesPerThreshold > 0 ? cfg.cisnesPerThreshold : 10));
    } catch {
      setThreshold(100);
      setCisnes("10");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Ejemplo dinámico: Cisnes que ganaría alguien que gasta $500.
  const cisnesNum = Number(cisnes) > 0 ? Number(cisnes) : 0;
  const exampleSpend = 500;
  const exampleEarned = Math.floor(exampleSpend / threshold) * cisnesNum;

  async function onSave() {
    if (!(cisnesNum > 0)) {
      Alert.alert("Valor inválido", "Los Cisnes que gana deben ser mayor a 0.");
      return;
    }
    setSaving(true);
    try {
      await savePointsConfig(threshold, cisnesNum);
      Alert.alert("Guardado", "La configuración de puntos se guardó.");
    } catch {
      Alert.alert("Error", "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuración de puntos</Text>
          <Text style={styles.subtitle}>
            Cuántos Cisnes gana el cliente por su gasto.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Por cada</Text>
          <View style={styles.chips}>
            {THRESHOLDS.map((t) => {
              const active = threshold === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setThreshold(t)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    ${t.toLocaleString("es-MX")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Cisnes que gana</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 10"
            placeholderTextColor={colors.muted}
            value={cisnes}
            onChangeText={setCisnes}
            keyboardType="numeric"
          />

          <Text style={styles.example}>
            Ejemplo: si gasta ${exampleSpend.toLocaleString("es-MX")}, gana{" "}
            {exampleEarned} Cisnes.
          </Text>

          <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving}>
            <Text style={styles.saveText}>
              {saving ? "Guardando…" : "Guardar"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: font.size.display - 8, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  form: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    fontFamily: fonts.semibold,
  },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    backgroundColor: "#efeae0",
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  chipActive: { backgroundColor: colors.ground },
  chipText: { fontSize: font.size.md, fontFamily: fonts.bold, color: colors.subtleOnCard },
  chipTextActive: { color: colors.goldSoft },
  input: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink, fontFamily: fonts.regular },
  example: {
    fontSize: font.size.sm,
    color: colors.muted,
    lineHeight: 18,
    fontStyle: "italic", fontFamily: fonts.regular },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: "#231b06", fontFamily: fonts.bold, fontSize: font.size.md },
});
