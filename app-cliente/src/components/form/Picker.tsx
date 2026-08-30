import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";
import { colors, spacing, radius, font } from "@/theme";

export interface PickerOption {
  value: string;
  label: string;
  hint?: string; // ej. precio
  group?: string; // ej. "Faciales"
}

// Desplegable con buscador. Para listas largas (decenas de tratamientos) es
// mucho más cómodo que una fila de chips: se abre, se busca y se elige.
export function Picker({
  label,
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  error,
  helper,
  required = false,
  disabled = false,
  searchable = true,
  title,
  empty = "Sin opciones disponibles.",
}: {
  label: string;
  options: PickerOption[];
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  title?: string;
  empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  // Filtra por texto y agrupa conservando el orden de aparición del grupo.
  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter((o) => o.label.toLowerCase().includes(needle))
      : options;
    const map = new Map<string, PickerOption[]>();
    for (const o of list) {
      const g = o.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()].map(([group, items]) => ({ group, items }));
  }, [options, q]);

  const flat = useMemo(
    () =>
      sections.flatMap((s) =>
        s.group
          ? [{ kind: "header" as const, key: "h:" + s.group, group: s.group }, ...s.items.map((i) => ({ kind: "item" as const, key: i.value, item: i }))]
          : s.items.map((i) => ({ kind: "item" as const, key: i.value, item: i })),
      ),
    [sections],
  );

  function close() {
    setOpen(false);
    setQ("");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.trigger, !!error && styles.triggerError, disabled && styles.triggerOff]}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
            {selected ? selected.label : placeholder}
          </Text>
          {selected?.hint ? <Text style={styles.triggerHint}>{selected.hint}</Text> : null}
        </View>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{title ?? label}</Text>

          {searchable && options.length > 6 ? (
            <TextInput
              style={styles.search}
              placeholder="Buscar…"
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
          ) : null}

          {flat.length === 0 ? (
            <Text style={styles.empty}>{q ? "Sin resultados." : empty}</Text>
          ) : (
            <FlatList
              data={flat}
              keyExtractor={(r) => r.key}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item: row }) =>
                row.kind === "header" ? (
                  <Text style={styles.group}>{row.group}</Text>
                ) : (
                  <Pressable
                    style={[styles.row, row.item.value === value && styles.rowOn]}
                    onPress={() => {
                      onChange(row.item.value);
                      close();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText}>{row.item.label}</Text>
                      {row.item.hint ? <Text style={styles.rowHint}>{row.item.hint}</Text> : null}
                    </View>
                    {row.item.value === value ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                )
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  req: { color: colors.goldDeep },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 46,
  },
  triggerError: { borderColor: colors.danger },
  triggerOff: { opacity: 0.5 },
  triggerText: { fontSize: font.size.md, color: colors.ink, fontWeight: "500" },
  placeholder: { color: colors.muted, fontWeight: "400" },
  triggerHint: { fontSize: font.size.xs, color: colors.goldDeep, fontWeight: "700", marginTop: 2 },
  caret: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontWeight: "600" },
  helper: { color: colors.subtleOnCard, fontSize: font.size.xs, marginTop: 4 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,13,15,0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
  },
  grabber: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardLine,
    marginTop: spacing.md,
  },
  sheetTitle: {
    fontSize: font.size.xl,
    fontWeight: "600",
    color: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  search: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink,
  },
  list: { paddingHorizontal: spacing.lg },
  group: {
    fontSize: font.size.xs,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  rowOn: { backgroundColor: "#fff" },
  rowText: { fontSize: font.size.md, color: colors.ink },
  rowHint: { fontSize: font.size.xs, color: colors.goldDeep, fontWeight: "700", marginTop: 2 },
  check: { color: colors.goldDeep, fontWeight: "800", fontSize: 16 },
  empty: {
    color: colors.muted,
    fontSize: font.size.md,
    textAlign: "center",
    paddingVertical: spacing.xxl,
  },
});
