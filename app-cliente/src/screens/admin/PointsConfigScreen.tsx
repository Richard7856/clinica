import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { getClinicSettings, savePointsConfig } from "@/lib/admin";
import { ScreenHeader, Card, Loader, useBack } from "@/components/ui/Screen";
import { Segmented, type SegmentedOption } from "@/components/ui/Controls";
import { Field } from "@/components/form/Field";
import { Button } from "@/components/form/Button";
import { Swan } from "@/components/Swan";
import { useToast } from "@/components/ui/UIProvider";
import { numero } from "@/lib/validate";
import { colors, spacing, font, fonts } from "@/theme";

type Umbral = "100" | "1000";
const UMBRALES: SegmentedOption<Umbral>[] = [
  { value: "100", label: "$100" },
  { value: "1000", label: "$1,000" },
];

// Panel admin: cuántos Cisnes gana el cliente por su gasto.
// Se guarda en settings/clinic (pointsThreshold + cisnesPerThreshold).
export function PointsConfigScreen() {
  const back = useBack();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [umbral, setUmbral] = useState<Umbral>("100");
  const [cisnes, setCisnes] = useState("10");
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const cfg = await getClinicSettings();
      setUmbral(cfg?.pointsThreshold === 1000 ? "1000" : "100");
      setCisnes(
        String(cfg?.cisnesPerThreshold && cfg.cisnesPerThreshold > 0 ? cfg.cisnesPerThreshold : 10),
      );
    } catch {
      toast.error("No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const umbralNum = Number(umbral);
  const cisnesNum = Number(cisnes) > 0 ? Number(cisnes) : 0;

  // Tres ejemplos en vez de uno: así se ve de inmediato que los Cisnes se
  // otorgan por tramos completos y no de forma proporcional.
  const ejemplos = [500, 1500, 6500].map((gasto) => ({
    gasto,
    gana: Math.floor(gasto / umbralNum) * cisnesNum,
  }));

  async function onSave() {
    const e = numero(cisnes, { min: 1, campo: "Los Cisnes" });
    setError(e);
    if (e) return;

    setSaving(true);
    try {
      await savePointsConfig(umbralNum, cisnesNum);
      toast.success("Configuración guardada.");
    } catch {
      toast.error("No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <Loader />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Puntos"
        onBack={back}
        subtitle="Cuántos Cisnes gana el cliente por su gasto."
      />

      <Card>
        <Text style={styles.label}>Por cada</Text>
        <Segmented options={UMBRALES} value={umbral} onChange={setUmbral} />

        <View style={{ height: spacing.lg }} />

        <Field
          label="Cisnes que gana"
          required
          value={cisnes}
          onChangeText={setCisnes}
          placeholder="10"
          keyboardType="numeric"
          error={error}
        />

        <Button title="Guardar" onPress={onSave} loading={saving} />
      </Card>

      <Card style={styles.preview}>
        <Text style={styles.previewTitle}>Cómo queda</Text>
        {ejemplos.map((e) => (
          <View key={e.gasto} style={styles.exampleRow}>
            <Text style={styles.spend}>
              Gasta ${e.gasto.toLocaleString("es-MX")}
            </Text>
            <View style={styles.earn}>
              <Swan size={14} color={colors.goldDeep} />
              <Text style={styles.earnNum}>{e.gana}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.note}>
          Los Cisnes se otorgan por tramos completos: gastar ${(umbralNum * 1.9).toLocaleString(
            "es-MX",
          )}{" "}
          da lo mismo que gastar ${umbralNum.toLocaleString("es-MX")}.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  preview: { backgroundColor: "#efeade" },
  previewTitle: {
    fontSize: font.size.md,
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
    marginBottom: spacing.sm,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  spend: { fontSize: font.size.md, color: colors.subtleOnCard, fontFamily: fonts.regular },
  earn: { flexDirection: "row", alignItems: "center", gap: 5 },
  earnNum: { fontSize: font.size.lg, color: colors.goldDeep, fontFamily: fonts.extrabold },
  note: {
    fontSize: font.size.xs,
    color: colors.muted,
    fontFamily: fonts.regular,
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
