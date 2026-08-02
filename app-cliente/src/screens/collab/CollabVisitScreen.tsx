import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, radius, font } from "@/theme";
import { Swan } from "@/components/Swan";
import { awardVisitPoints } from "@/lib/collaborator";
import type { CitasStackParams } from "@/navigation/CollaboratorTabs";

// Panel colaborador: detalle de una cita. Valida el QR del cliente (debe
// coincidir con el id de la cita) y sólo entonces permite asignar los Cisnes.

type Props = NativeStackScreenProps<CitasStackParams, "VisitDetail">;

// Formatea la hora de la cita a hh:mm (es-MX).
function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function CollabVisitScreen({ route, navigation }: Props) {
  const { visit } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Evita procesar el mismo QR varias veces (la cámara emite muchas lecturas
  // por segundo). Se libera al reintentar tras un QR incorrecto.
  const scanLock = useRef<boolean>(false);

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanLock.current) return;
      const data = result.data?.trim();
      if (!data) return;
      scanLock.current = true;

      if (data === visit.id) {
        // QR válido: coincide con la cita.
        setVerified(true);
        setScanning(false);
      } else {
        Alert.alert(
          "QR incorrecto",
          "El QR no corresponde a esta cita.",
          [
            {
              text: "Reintentar",
              onPress: () => {
                scanLock.current = false; // rearma el escaneo
              },
            },
          ],
        );
      }
    },
    [visit.id],
  );

  function startScan() {
    scanLock.current = false;
    setScanning(true);
  }

  async function onAward() {
    const monto = Number(amount.replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) {
      Alert.alert("Monto inválido", "Escribe el monto gastado (mayor a 0).");
      return;
    }
    setSaving(true);
    try {
      const { earned } = await awardVisitPoints(visit.id, monto);
      Alert.alert("Listo", `¡${earned} Cisnes asignados!`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudieron asignar los Cisnes.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* --- Datos del cliente --- */}
      <View style={styles.card}>
        <Text style={styles.name}>{visit.patientName}</Text>
        {visit.patientEmail ? (
          <Text style={styles.email}>{visit.patientEmail}</Text>
        ) : null}

        <View style={styles.pointsRow}>
          <Swan size={16} color={colors.goldDeep} />
          <Text style={styles.pointsText}>{visit.patientPoints} Cisnes</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tratamiento</Text>
          <Text style={styles.metaValue}>{visit.treatmentName}</Text>
        </View>
        {visit.clinicName ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Clínica</Text>
            <Text style={styles.metaValue}>{visit.clinicName}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Hora</Text>
          <Text style={styles.metaValue}>{formatTime(visit.startAt)}</Text>
        </View>
      </View>

      {/* --- Cita ya atendida: no se puede reasignar --- */}
      {visit.pointsAwarded ? (
        <View style={styles.okBox}>
          <Text style={styles.okText}>
            Esta cita ya fue atendida (Cisnes asignados)
          </Text>
        </View>
      ) : (
        <>
          {/* --- Paso 1: validar QR --- */}
          {!verified && (
            <View style={styles.card}>
              {!scanning ? (
                <>
                  <Text style={styles.stepText}>
                    Valida al cliente escaneando el QR de su cita.
                  </Text>
                  {permission && !permission.granted ? (
                    <Pressable style={styles.goldBtn} onPress={requestPermission}>
                      <Text style={styles.goldBtnText}>Permitir cámara</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.goldBtn} onPress={startScan}>
                      <Text style={styles.goldBtnText}>
                        Escanear QR del cliente
                      </Text>
                    </Pressable>
                  )}
                </>
              ) : (
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
                </View>
              )}
            </View>
          )}

          {/* --- Paso 2: QR validado, capturar monto --- */}
          {verified && (
            <View style={styles.card}>
              <View style={styles.verifiedRow}>
                <Swan size={18} color={colors.ok} />
                <Text style={styles.verifiedText}>✓ QR validado</Text>
              </View>

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
            </View>
          )}
        </>
      )}

      {/* --- Volver --- */}
      <Pressable style={styles.darkBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.darkBtnText}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  // Tarjetas
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    fontSize: font.size.xl,
    fontWeight: "500",
    color: colors.textOnCard,
  },
  email: { fontSize: font.size.sm, color: colors.muted },
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
  stepText: {
    fontSize: font.size.md,
    color: colors.subtleOnCard,
    lineHeight: 20,
  },

  // Aviso cita ya atendida
  okBox: {
    backgroundColor: "#e4f0e8",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  okText: { fontSize: font.size.md, color: colors.ok, fontWeight: "700" },

  // QR validado
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  verifiedText: { fontSize: font.size.md, color: colors.ok, fontWeight: "700" },

  // Cámara
  cameraWrap: {
    aspectRatio: 1,
    width: "100%",
    maxWidth: 320,
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

  // Formulario de monto
  inputLabel: {
    fontSize: font.size.sm,
    color: colors.subtleOnCard,
    marginTop: spacing.sm,
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
  },
  darkBtnText: {
    color: colors.goldSoft,
    fontWeight: "700",
    fontSize: font.size.md,
  },
  btnDisabled: { opacity: 0.6 },
});
