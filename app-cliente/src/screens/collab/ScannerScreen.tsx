import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { colors, spacing, radius, font } from "@/theme";
import { Swan } from "@/components/Swan";
import { lookupAppointment, awardVisitPoints } from "@/lib/collaborator";
import type { ScannedVisit } from "@/lib/collaborator";

// Panel colaborador: escanea el QR de una cita y asigna los Cisnes.
// Los puntos SOLO se otorgan aquí, tras capturar el monto gastado.

type Phase = "scanning" | "found" | "done";

// Formatea la fecha ISO de la cita a algo legible en español.
function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [visit, setVisit] = useState<ScannedVisit | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [earned, setEarned] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Evita disparar lookup varias veces por el mismo QR (la cámara emite
  // muchas lecturas por segundo). El flag se rearma al volver a "scanning".
  const scanLock = useRef<boolean>(false);

  const resetToScanning = useCallback(() => {
    setVisit(null);
    setAmount("");
    setEarned(0);
    setPhase("scanning");
    scanLock.current = false;
  }, []);

  const onBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanLock.current || loading) return;
      const appointmentId = result.data?.trim();
      if (!appointmentId) return;

      scanLock.current = true; // bloquea nuevas lecturas mientras consultamos
      setLoading(true);
      try {
        const scanned = await lookupAppointment(appointmentId);
        setVisit(scanned);
        setPhase("found");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo leer la cita.";
        Alert.alert("QR no válido", msg, [
          {
            text: "Reintentar",
            onPress: () => {
              scanLock.current = false; // rearma el escaneo
            },
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  async function onAward() {
    if (!visit) return;
    const monto = Number(amount.replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) {
      Alert.alert("Monto inválido", "Escribe el monto gastado (mayor a 0).");
      return;
    }
    setSaving(true);
    try {
      const { earned: got } = await awardVisitPoints(visit.appointment.id, monto);
      setEarned(got);
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudieron asignar los Cisnes.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }

  // --- Permiso de cámara ---
  if (!permission) {
    // Estado de carga del permiso.
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Swan size={56} color={colors.ink} />
        <Text style={styles.permTitle}>Cámara sin permiso</Text>
        <Text style={styles.permText}>
          Necesitamos la cámara para leer el QR de la cita del cliente.
        </Text>
        <Pressable style={styles.goldBtn} onPress={requestPermission}>
          <Text style={styles.goldBtnText}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Escanear cita</Text>

      {/* --- FASE: escaneando --- */}
      {phase === "scanning" && (
        <>
          <Text style={styles.subtitle}>
            Apunta al QR de la cita del cliente.
          </Text>
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            {/* Overlay de esquinas para encuadrar el QR */}
            <View pointerEvents="none" style={styles.overlay}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            {loading && (
              <View style={styles.cameraLoading}>
                <ActivityIndicator color={colors.cream} />
              </View>
            )}
          </View>
        </>
      )}

      {/* --- FASE: cita encontrada --- */}
      {phase === "found" && visit && (
        <View style={styles.card}>
          <Text style={styles.patientName}>{visit.patient.fullName}</Text>
          <View style={styles.pointsRow}>
            <Swan size={18} color={colors.goldDeep} />
            <Text style={styles.pointsText}>
              {visit.patient.points} Cisnes actuales
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tratamiento</Text>
            <Text style={styles.metaValue}>
              {visit.appointment.treatmentId || "Tratamiento"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>
              {formatDate(visit.appointment.startAt)}
            </Text>
          </View>

          {visit.alreadyAwarded ? (
            <>
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>
                  Esta cita ya tiene Cisnes asignados.
                </Text>
              </View>
              <Pressable style={styles.darkBtn} onPress={resetToScanning}>
                <Text style={styles.darkBtnText}>Escanear otra</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Monto gastado ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <Pressable
                style={[styles.goldBtn, saving && styles.btnDisabled]}
                onPress={onAward}
                disabled={saving}
              >
                <Text style={styles.goldBtnText}>
                  {saving ? "Asignando…" : "Asignar Cisnes"}
                </Text>
              </Pressable>
              <Pressable onPress={resetToScanning} hitSlop={8}>
                <Text style={styles.cancelLink}>Cancelar</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* --- FASE: asignado --- */}
      {phase === "done" && visit && (
        <View style={styles.doneWrap}>
          <Swan size={72} color={colors.gold} />
          <Text style={styles.doneTitle}>
            ¡{earned} Cisnes asignados a {visit.patient.fullName}!
          </Text>
          <Text style={styles.doneSub}>La visita quedó registrada.</Text>
          <Pressable style={styles.goldBtn} onPress={resetToScanning}>
            <Text style={styles.goldBtnText}>Escanear otra cita</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: font.size.display - 8,
    fontWeight: "300",
    color: colors.ink,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },

  // Permiso de cámara
  permTitle: {
    fontSize: font.size.xl,
    fontWeight: "500",
    color: colors.ink,
    marginTop: spacing.md,
  },
  permText: {
    fontSize: font.size.md,
    color: colors.subtleOnCard,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // Cámara
  cameraWrap: {
    aspectRatio: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.ground,
  },
  overlay: { ...StyleSheet.absoluteFillObject, margin: spacing.lg },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: colors.goldSoft,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.sm,
  },
  cameraLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(13,13,15,0.45)",
  },

  // Tarjeta de cita
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  patientName: {
    fontSize: font.size.xl,
    fontWeight: "500",
    color: colors.textOnCard,
  },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  pointsText: {
    fontSize: font.size.sm,
    color: colors.goldDeep,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  metaLabel: { fontSize: font.size.sm, color: colors.subtleOnCard },
  metaValue: {
    fontSize: font.size.sm,
    color: colors.textOnCard,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: spacing.md,
  },
  inputLabel: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.size.md,
    color: colors.ink,
  },
  warnBox: {
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  warnText: { fontSize: font.size.sm, color: "#7a4a40", fontWeight: "600" },

  // Botones
  goldBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
  goldBtnText: { color: "#231b06", fontWeight: "700", fontSize: font.size.md },
  darkBtn: {
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  darkBtnText: { color: colors.goldSoft, fontWeight: "700", fontSize: font.size.md },
  btnDisabled: { opacity: 0.6 },
  cancelLink: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.sm,
    marginTop: spacing.md,
    fontWeight: "600",
  },

  // Éxito
  doneWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  doneTitle: {
    fontSize: font.size.xl,
    fontWeight: "500",
    color: colors.ink,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  doneSub: {
    fontSize: font.size.md,
    color: colors.subtleOnCard,
    textAlign: "center",
  },
});
