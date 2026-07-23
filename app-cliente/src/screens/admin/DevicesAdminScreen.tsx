import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { listDevices, setDeviceStatus } from "@/lib/admin";
import { colors, spacing, radius, font } from "@/theme";
import type { Device } from "@/lib/types";

// Panel admin: estado de los aparatos/equipos de la clínica.
// Cada aparato puede ponerse en Activo / Mantenimiento / Baja.

type DeviceStatus = Device["status"];

// Metadatos por estado: etiqueta corta del chip y color del indicador.
const STATUS_META: Record<DeviceStatus, { label: string; color: string }> = {
  active: { label: "Activo", color: colors.ok },
  maintenance: { label: "Mantenim.", color: colors.gold },
  disabled: { label: "Baja", color: colors.muted },
};

// Orden de los chips en la tarjeta.
const STATUS_ORDER: DeviceStatus[] = ["active", "maintenance", "disabled"];

export function DevicesAdminScreen() {
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listDevices());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cambio de estado con actualización optimista; si falla, recargamos.
  async function onSetStatus(d: Device, status: DeviceStatus) {
    if (d.status === status) return;
    setItems((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, status } : x)),
    );
    try {
      await setDeviceStatus(d.id, status);
    } catch {
      load(); // revertir si falla
    }
  }

  function renderItem({ item }: { item: Device }) {
    const meta = STATUS_META[item.status];
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
          {item.type ? (
            <Text style={styles.cardType}>{item.type}</Text>
          ) : null}
        </View>
        <View style={styles.chips}>
          {STATUS_ORDER.map((s) => {
            const active = item.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => onSetStatus(item, s)}
                style={[
                  styles.chip,
                  active && { backgroundColor: STATUS_META[s].color },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                  ]}
                >
                  {STATUS_META[s].label}
                </Text>
              </Pressable>
            );
          })}
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
          <View style={styles.header}>
            <Text style={styles.title}>Aparatos</Text>
            <Text style={styles.subtitle}>
              Estado de cada equipo de la clínica.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>No hay aparatos registrados.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: font.size.display - 8, fontWeight: "300", color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontWeight: "500",
    flexShrink: 1,
  },
  cardType: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 4,
    marginLeft: 18,
  },
  chips: { gap: spacing.xs, alignItems: "stretch" },
  chip: {
    backgroundColor: "#efeae0",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  chipText: { fontSize: 11, fontWeight: "700", color: colors.subtleOnCard },
  chipTextActive: { color: "#fff" },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
