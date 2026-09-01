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
import { colors, spacing, radius, font, fonts } from "@/theme";

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
  multiple = false,
  values,
  onChangeValues,
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
  // Modo múltiple: `values` manda sobre `value` y la hoja queda abierta.
  multiple?: boolean;
  values?: string[];
  onChangeValues?: (v: string[]) => void;
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

  const seleccion = values ?? [];
  const selected = options.find((o) => o.value === value) ?? null;

  // Qué dice el disparador: el nombre si es uno solo, un resumen si son varios.
  const resumen = useMemo(() => {
    if (!multiple) return selected?.label ?? null;
    if (seleccion.length === 0) return null;
    if (seleccion.length === 1) {
      return options.find((o) => o.value === seleccion[0])?.label ?? "1 seleccionado";
    }
    return `${seleccion.length} seleccionados`;
  }, [multiple, selected, seleccion, options]);

  function toggle(v: string) {
    onChangeValues?.(
      seleccion.includes(v) ? seleccion.filter((x) => x !== v) : [...seleccion, v],
    );
  }

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
          <Text style={[styles.triggerText, !resumen && styles.placeholder]} numberOfLines={1}>
            {resumen ?? placeholder}
          </Text>
          {!multiple && selected?.hint ? (
            <Text style={styles.triggerHint}>{selected.hint}</Text>
          ) : null}
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
                    style={[
                      styles.row,
                      (multiple ? seleccion.includes(row.item.value) : row.item.value === value) &&
                        styles.rowOn,
                    ]}
                    onPress={() => {
                      if (multiple) {
                        toggle(row.item.value);
                        return; // la hoja sigue abierta para seguir eligiendo
                      }
                      onChange(row.item.value);
                      close();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText}>{row.item.label}</Text>
                      {row.item.hint ? <Text style={styles.rowHint}>{row.item.hint}</Text> : null}
                    </View>
                    {(multiple ? seleccion.includes(row.item.value) : row.item.value === value) ? (
                      <Text style={styles.check}>✓</Text>
                    ) : null}
                  </Pressable>
                )
              }
            />
          )}

          {multiple ? (
            <Pressable style={styles.listo} onPress={close} accessibilityRole="button">
              <Text style={styles.listoText}>
                {seleccion.length > 0 ? `Listo · ${seleccion.length}` : "Listo"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  listo: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.md,
  },
  listoText: { color: "#231b06", fontFamily: fonts.bold, fontSize: font.size.md },
  label: {
    fontSize: font.size.xs,
    letterSpacing: 1.2,
    color: colors.muted,
    fontFamily: fonts.bold,
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
  triggerText: { fontSize: font.size.md, color: colors.ink, fontFamily: fonts.medium },
  placeholder: { color: colors.muted, fontFamily: fonts.regular },
  triggerHint: { fontSize: font.size.xs, color: colors.goldDeep, fontFamily: fonts.bold, marginTop: 2 },
  caret: { color: colors.muted, fontSize: 14, fontFamily: fonts.regular },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.semibold },
  helper: { color: colors.subtleOnCard, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.regular },

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
    fontFamily: fonts.semibold,
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
    color: colors.ink, fontFamily: fonts.regular },
  list: { paddingHorizontal: spacing.lg },
  group: {
    fontSize: font.size.xs,
    fontFamily: fonts.extrabold,
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
  rowText: { fontSize: font.size.md, color: colors.ink, fontFamily: fonts.regular },
  rowHint: { fontSize: font.size.xs, color: colors.goldDeep, fontFamily: fonts.bold, marginTop: 2 },
  check: { color: colors.goldDeep, fontFamily: fonts.extrabold, fontSize: 16 },
  empty: {
    color: colors.muted,
    fontSize: font.size.md,
    textAlign: "center",
    paddingVertical: spacing.xxl, fontFamily: fonts.regular },
});
