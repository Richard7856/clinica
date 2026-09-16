import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font, fonts } from "@/theme";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/UIProvider";

export function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!email.includes("@")) return toast.error("Escribe un correo válido.");
    if (password.length < 6)
      return toast.error("La contraseña debe tener al menos 6 caracteres.");
    if (mode === "up" && fullName.trim().length < 3)
      return toast.error("Escribe tu nombre completo.");

    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password, fullName);
    } catch {
      toast.error(
        mode === "in"
          ? "Correo o contraseña incorrectos."
          : "No se pudo crear la cuenta. ¿Ya existe ese correo?",
      );
    } finally {
      setBusy(false);
    }
  }

  // Recuperar contraseña. Se responde igual exista o no la cuenta, para no
  // revelar qué correos están registrados.
  async function onReset() {
    if (!email.includes("@"))
      return toast.error("Escribe tu correo y vuelve a tocar «Olvidé mi contraseña».");
    setBusy(true);
    try {
      await resetPassword(email);
    } catch {
      // se ignora a propósito
    } finally {
      setBusy(false);
      toast.success("Si ese correo tiene cuenta, te llegaron las instrucciones.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Swan size={64} color={colors.ink} />
        <Text style={styles.wordmark}>L'ECROBELLE</Text>
        <Text style={styles.tagline}>Belleza a tu alcance.</Text>

        {mode === "up" ? (
          <TextInput
            style={styles.field}
            placeholder="Nombre completo"
            placeholderTextColor="#a49d8f"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
        ) : null}
        <TextInput
          style={styles.field}
          placeholder="Correo electrónico"
          placeholderTextColor="#a49d8f"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.field}
          placeholder="Contraseña"
          placeholderTextColor="#a49d8f"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [styles.goldBtn, pressed && { opacity: 0.9 }]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.goldBtnText}>
            {busy ? "Un momento…" : mode === "in" ? "Iniciar sesión" : "Crear cuenta"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === "in" ? "up" : "in")}>
          <Text style={styles.switch}>
            {mode === "in"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </Text>
        </Pressable>

        {mode === "in" ? (
          <Pressable onPress={onReset} disabled={busy} hitSlop={8}>
            <Text style={styles.olvide}>Olvidé mi contraseña</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  olvide: {
    marginTop: spacing.md,
    fontSize: font.size.sm,
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  root: { flex: 1, backgroundColor: colors.cream },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    fontFamily: fonts.display,
    letterSpacing: 6,
    fontSize: 22,
    color: colors.ink,
    marginTop: spacing.md,
  },
  tagline: {
    fontStyle: "italic",
    color: colors.muted,
    fontSize: font.size.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xl, fontFamily: fonts.regular },
  field: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#d8d1c4",
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.ink,
    marginTop: spacing.md, fontFamily: fonts.regular },
  goldBtn: {
    width: "100%",
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  goldBtnText: {
    color: "#231b06",
    fontFamily: fonts.bold,
    fontSize: font.size.md,
    letterSpacing: 0.5,
  },
  switch: { color: colors.goldDeep, fontSize: font.size.sm, marginTop: spacing.lg, fontFamily: fonts.regular },
});
