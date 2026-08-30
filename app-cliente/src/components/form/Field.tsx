import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type KeyboardTypeOptions,
} from "react-native";
import { colors, spacing, radius, font } from "@/theme";

// Campo de formulario con etiqueta, ayuda y error inline. El error se muestra
// debajo del campo (no en un Alert) y pinta el borde para ubicarlo de un vistazo.
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  required = false,
  multiline = false,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  prefix?: string;
  suffix?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.box,
          focus && styles.boxFocus,
          !!error && styles.boxError,
          multiline && styles.boxMultiline,
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
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
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  boxMultiline: { minHeight: 92, alignItems: "flex-start", paddingVertical: spacing.sm },
  boxFocus: { borderColor: colors.gold },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: font.size.md, color: colors.ink, paddingVertical: 10 },
  inputMultiline: { textAlignVertical: "top", minHeight: 72 },
  affix: { fontSize: font.size.md, color: colors.muted, fontWeight: "600" },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: 4, fontWeight: "600" },
  helper: { color: colors.subtleOnCard, fontSize: font.size.xs, marginTop: 4 },
});
