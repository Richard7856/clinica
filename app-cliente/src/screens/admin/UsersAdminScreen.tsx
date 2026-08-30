import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from "react-native";
import {
  listPatients,
  setPatientBanned,
  setPatientStoreEnabled,
} from "@/lib/admin";
import type { Patient } from "@/lib/types";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Gestión de usuarios (clientes). Permite bloquear el acceso y habilitar la
// tienda por cliente. Los Switches usan actualización optimista.
export function UsersAdminScreen() {
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPatients());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtro local por nombre o email.
  const filtered = useMemo<Patient[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [items, search]);

  // Acceso: switch ON = activo (banned=false). Optimista.
  const onToggleAccess = useCallback(
    async (p: Patient, active: boolean) => {
      const banned = !active;
      setItems((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, banned } : x)),
      );
      try {
        await setPatientBanned(p.id, banned);
      } catch {
        setItems((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, banned: !banned } : x)),
        );
      }
    },
    [],
  );

  // Tienda: switch = storeEnabled. Optimista.
  const onToggleStore = useCallback(
    async (p: Patient, storeEnabled: boolean) => {
      setItems((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, storeEnabled } : x)),
      );
      try {
        await setPatientStoreEnabled(p.id, storeEnabled);
      } catch {
        setItems((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, storeEnabled: !storeEnabled } : x,
          ),
        );
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Patient }) => {
      const active = !item.banned;
      const store = Boolean(item.storeEnabled);
      return (
        <View style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.fullName || "Sin nombre"}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {item.email}
            </Text>
            <View style={styles.cisnesRow}>
              <Swan size={12} color={colors.goldDeep} />
              <Text style={styles.cisnes}>
                {item.points.toLocaleString("es-MX")} Cisnes
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            <View style={styles.switchCol}>
              <Text style={styles.switchTitle}>Acceso</Text>
              <Switch
                value={active}
                onValueChange={(v) => onToggleAccess(item, v)}
                trackColor={{ true: colors.gold, false: "#d8d1c4" }}
                thumbColor="#fff"
              />
              <Text
                style={[
                  styles.state,
                  { color: active ? colors.goldDeep : colors.danger },
                ]}
              >
                {active ? "Activo" : "Bloqueado"}
              </Text>
            </View>

            <View style={styles.switchCol}>
              <Text style={styles.switchTitle}>Tienda</Text>
              <Switch
                value={store}
                onValueChange={(v) => onToggleStore(item, v)}
                trackColor={{ true: colors.gold, false: "#d8d1c4" }}
                thumbColor="#fff"
              />
              <Text
                style={[
                  styles.state,
                  { color: store ? colors.goldDeep : colors.muted },
                ]}
              >
                {store ? "Con tienda" : "Sin tienda"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [onToggleAccess, onToggleStore],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Usuarios</Text>
              <Text style={styles.subtitle}>
                Restringe acceso y habilita la tienda por cliente.
              </Text>
            </View>
            <TextInput
              style={styles.search}
              placeholder="Buscar por nombre o email…"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>No hay usuarios.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: font.size.display - 8, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontSize: font.size.sm, color: colors.muted, marginTop: 2, fontFamily: fonts.regular },
  search: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink,
    marginBottom: spacing.lg, fontFamily: fonts.regular },
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
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  email: { fontSize: font.size.sm, color: colors.subtleOnCard, marginTop: 2, fontFamily: fonts.regular },
  cisnesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  cisnes: { fontSize: font.size.sm, color: colors.goldDeep, fontFamily: fonts.bold },
  controls: { flexDirection: "row", gap: spacing.lg },
  switchCol: { alignItems: "center", gap: 4 },
  switchTitle: {
    fontSize: font.size.xs,
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  state: { fontSize: 10, fontFamily: fonts.bold },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
