import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font } from "@/theme";
import { useAuth } from "@/lib/auth";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.includes("@") || password.length < 6) {
      Alert.alert("Datos incompletos", "Revisa tu correo y una contraseña de al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password);
    } catch (e) {
      Alert.alert(
        "No se pudo continuar",
        mode === "in"
          ? "Correo o contraseña incorrectos."
          : "No se pudo crear la cuenta. ¿Ya existe ese correo?",
      );
    } finally {
      setBusy(false);
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  wordmark: {
    fontWeight: "200",
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
    marginBottom: spacing.xl,
  },
  field: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#d8d1c4",
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.ink,
    marginTop: spacing.md,
  },
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
    fontWeight: "700",
    fontSize: font.size.md,
    letterSpacing: 0.5,
  },
  switch: { color: colors.goldDeep, fontSize: font.size.sm, marginTop: spacing.lg },
});
