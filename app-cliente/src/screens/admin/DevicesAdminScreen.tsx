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
import {
  listDevices,
  setDeviceStatus,
  createDevice,
  updateDevice,
  listClinics,
} from "@/lib/admin";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { Device, Clinic } from "@/lib/types";

// Panel admin: aparatos/equipos de la clínica.
// Estado (Activo / Mantenimiento / Baja), clínica asignada y horario.

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
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form "+ Nuevo".
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [clinicId, setClinicId] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Edición inline por aparato.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClinicId, setEditClinicId] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [devs, cls] = await Promise.all([listDevices(), listClinics()]);
      setItems(devs);
      setClinics(cls);
    } catch {
      setItems([]);
      setClinics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Nombre de la clínica a partir de su id (o "Sin clínica").
  function clinicName(id?: string): string {
    if (!id) return "Sin clínica";
    return clinics.find((c) => c.id === id)?.name ?? "Sin clínica";
  }

  // Cambio de estado con actualización optimista; si falla, recargamos.
  async function onSetStatus(d: Device, status: DeviceStatus) {
    if (d.status === status) return;
    setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
    try {
      await setDeviceStatus(d.id, status);
    } catch {
      load(); // revertir si falla
    }
  }

  async function onCreate() {
    if (name.trim().length < 2) {
      Alert.alert("Falta nombre", "Escribe un nombre para el aparato.");
      return;
    }
    setSaving(true);
    try {
      await createDevice({
        name: name.trim(),
        type: type.trim(),
        clinicId: clinicId || undefined,
        hours: hours.trim(),
      });
      setName("");
      setType("");
      setClinicId("");
      setHours("");
      setShowForm(false);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo crear el aparato.");
    } finally {
      setSaving(false);
    }
  }

  // Abre la edición inline precargando los valores actuales.
  function onEdit(d: Device) {
    setEditingId(d.id);
    setEditClinicId(d.clinicId ?? "");
    setEditHours(d.hours ?? "");
  }

  async function onSaveEdit(d: Device) {
    try {
      await updateDevice(d.id, {
        clinicId: editClinicId || undefined,
        hours: editHours.trim(),
      });
      setEditingId(null);
      await load();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el aparato.");
    }
  }

  function renderItem({ item }: { item: Device }) {
    const meta = STATUS_META[item.status];
    const editing = editingId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <Text style={styles.cardTitle}>{item.name}</Text>
            </View>
            {item.type ? <Text style={styles.cardType}>{item.type}</Text> : null}
            <Text style={styles.metaLine}>{clinicName(item.clinicId)}</Text>
            <Text style={styles.metaLine}>{item.hours || "Sin horario"}</Text>
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
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {STATUS_META[s].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {editing ? (
          <View style={styles.editBox}>
            <Text style={styles.label}>Clínica</Text>
            <View style={styles.clinicChips}>
              <Pressable
                onPress={() => setEditClinicId("")}
                style={[
                  styles.clinicChip,
                  editClinicId === "" && styles.clinicChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.clinicChipText,
                    editClinicId === "" && styles.clinicChipTextActive,
                  ]}
                >
                  Sin clínica
                </Text>
              </Pressable>
              {clinics.map((c) => {
                const active = editClinicId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setEditClinicId(c.id)}
                    style={[styles.clinicChip, active && styles.clinicChipActive]}
                  >
                    <Text
                      style={[
                        styles.clinicChipText,
                        active && styles.clinicChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>Horario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Lun–Vie 10:00–21:00"
              placeholderTextColor={colors.muted}
              value={editHours}
              onChangeText={setEditHours}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                <Text style={styles.cancel}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtnSm} onPress={() => onSaveEdit(item)}>
                <Text style={styles.saveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => onEdit(item)} hitSlop={8}>
            <Text style={styles.editLink}>Editar</Text>
          </Pressable>
        )}
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
                <Text style={styles.title}>Aparatos</Text>
                <Text style={styles.subtitle}>
                  Estado de cada equipo de la clínica.
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
                  placeholder="Nombre (ej. Láser Alejandrita)"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tipo (ej. Depilación)"
                  placeholderTextColor={colors.muted}
                  value={type}
                  onChangeText={setType}
                />
                <Text style={styles.label}>Clínica</Text>
                <View style={styles.clinicChips}>
                  <Pressable
                    onPress={() => setClinicId("")}
                    style={[
                      styles.clinicChip,
                      clinicId === "" && styles.clinicChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.clinicChipText,
                        clinicId === "" && styles.clinicChipTextActive,
                      ]}
                    >
                      Sin clínica
                    </Text>
                  </Pressable>
                  {clinics.map((c) => {
                    const active = clinicId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setClinicId(c.id)}
                        style={[
                          styles.clinicChip,
                          active && styles.clinicChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.clinicChipText,
                            active && styles.clinicChipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Horario (ej. Lun–Vie 10:00–21:00)"
                  placeholderTextColor={colors.muted}
                  value={hours}
                  onChangeText={setHours}
                />
                <Pressable
                  style={styles.saveBtn}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Guardando…" : "Crear aparato"}
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
  label: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    fontFamily: fonts.semibold,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnSm: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  saveText: { color: "#231b06", fontFamily: fonts.bold, fontSize: font.size.md },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: {
    fontSize: font.size.lg,
    color: colors.textOnCard,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  cardType: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 4,
    marginLeft: 18, fontFamily: fonts.regular },
  metaLine: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 2,
    marginLeft: 18, fontFamily: fonts.regular },
  chips: { gap: spacing.xs, alignItems: "stretch" },
  chip: {
    backgroundColor: "#efeae0",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  chipText: { fontSize: 11, fontFamily: fonts.bold, color: colors.subtleOnCard },
  chipTextActive: { color: "#fff" },
  editLink: {
    color: colors.goldDeep,
    fontSize: font.size.xs,
    fontFamily: fonts.bold,
    marginTop: spacing.xs,
  },
  editBox: {
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  clinicChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  clinicChip: {
    backgroundColor: "#efeae0",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  clinicChipActive: { backgroundColor: colors.ground },
  clinicChipText: { fontSize: 11, fontFamily: fonts.bold, color: colors.subtleOnCard },
  clinicChipTextActive: { color: colors.goldSoft },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  cancel: { color: colors.muted, fontSize: font.size.sm, fontFamily: fonts.semibold },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
