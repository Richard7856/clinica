import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, Modal, Pressable, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/form/Button";
import { colors, spacing, radius, font } from "@/theme";

// Avisos y diálogos propios de la marca, en lugar de Alert del sistema.
//   const toast = useToast();  toast.success("Guardado");
//   const confirm = useConfirm();  if (await confirm({...})) { ... }

type ToastKind = "success" | "error" | "info";
interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface UIApi {
  toast: {
    success: (m: string) => void;
    error: (m: string) => void;
    info: (m: string) => void;
  };
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<UIApi | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => {
    setDialog(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    setDialog(null);
    resolver.current?.(v);
    resolver.current = null;
  }, []);

  const api = useMemo<UIApi>(
    () => ({
      toast: {
        success: (m) => push("success", m),
        error: (m) => push("error", m),
        info: (m) => push("info", m),
      },
      confirm,
    }),
    [push, confirm],
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Avisos */}
      <View style={[styles.toastWrap, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            style={[styles.toast, KIND[t.kind].box]}
          >
            <View style={[styles.dot, { backgroundColor: KIND[t.kind].dot }]} />
            <Text style={styles.toastText}>{t.message}</Text>
          </Pressable>
        ))}
      </View>

      {/* Diálogo de confirmación */}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dialogTitle}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.dialogMsg}>{dialog.message}</Text> : null}
            <View style={styles.dialogBtns}>
              <Button
                title={dialog?.cancelText ?? "Cancelar"}
                variant="ghost"
                onPress={() => close(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={dialog?.confirmText ?? "Confirmar"}
                variant={dialog?.danger ? "danger" : "primary"}
                onPress={() => close(true)}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const KIND: Record<ToastKind, { box: object; dot: string }> = {
  success: { box: { borderLeftColor: colors.ok }, dot: colors.ok },
  error: { box: { borderLeftColor: colors.danger }, dot: colors.danger },
  info: { box: { borderLeftColor: colors.gold }, dot: colors.gold },
};

function useUI(): UIApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI debe usarse dentro de UIProvider");
  return c;
}
export const useToast = () => useUI().toast;
export const useConfirm = () => useUI().confirm;

const styles = StyleSheet.create({
  toastWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 999, gap: spacing.sm },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.ground,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  toastText: { flex: 1, color: colors.cream, fontSize: font.size.sm, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13,13,15,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  dialogTitle: { fontSize: font.size.xl, fontWeight: "700", color: colors.ink },
  dialogMsg: {
    fontSize: font.size.md,
    color: colors.subtleOnCard,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  dialogBtns: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
});
