import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, StyleSheet, Pressable } from "react-native";
import {
  listRedemptions,
  honorRedemption,
  cancelRedemption,
  listPatients,
  type Redemption,
} from "@/lib/admin";
import { motivoFallo } from "@/lib/catalog";
import { ScreenHeader, Card, EmptyState, Loader, useBack } from "@/components/ui/Screen";
import { Pill } from "@/components/ui/Controls";
import { Swan } from "@/components/Swan";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { etiquetaDia } from "@/lib/schedule";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Canjes que las clientas apartaron desde la app. Aquí se entregan, y es en
// ese momento —no al pedirlos— cuando se descuentan los Cisnes.

const ESTADO: Record<string, { label: string; color: string }> = {
  pending: { label: "Por entregar", color: colors.gold },
  honored: { label: "Entregado", color: colors.ok },
  cancelled: { label: "Cancelado", color: colors.muted },
};

export function RedemptionsAdminScreen() {
  const back = useBack();
  const [items, setItems] = useState<Redemption[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const confirmar = useConfirm();

  const load = useCallback(async () => {
    const [reds, pats] = await Promise.allSettled([listRedemptions(), listPatients()]);
    if (reds.status === "fulfilled") setItems(reds.value);
    else {
      setItems([]);
      toast.error(`Canjes: ${motivoFallo(reds.reason)}`);
    }
    if (pats.status === "fulfilled") {
      setNombres(Object.fromEntries(pats.value.map((p) => [p.id, p.fullName])));
      setSaldos(Object.fromEntries(pats.value.map((p) => [p.id, p.points])));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Lo que espera entrega va primero: es lo único accionable.
  const secciones = useMemo(() => {
    const pendientes = items.filter((r) => r.status === "pending");
    const resto = items.filter((r) => r.status !== "pending");
    return [
      ...(pendientes.length ? [{ title: "Por entregar", data: pendientes }] : []),
      ...(resto.length ? [{ title: "Historial", data: resto }] : []),
    ];
  }, [items]);

  const pendientes = items.filter((r) => r.status === "pending").length;

  async function onEntregar(r: Redemption) {
    const saldo = saldos[r.patientId] ?? 0;
    const ok = await confirmar({
      title: "Entregar recompensa",
      message: `«${r.title}» a ${nombres[r.patientId] ?? "la clienta"}. Se le descontarán ${r.cost} Cisnes (tiene ${saldo}).`,
      confirmText: "Entregar",
    });
    if (!ok) return;
    try {
      const { saldo: nuevo } = await honorRedemption(r.id);
      toast.success(`Entregado. Le quedan ${nuevo} Cisnes.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo entregar.");
    }
  }

  async function onCancelar(r: Redemption) {
    const ok = await confirmar({
      title: "Cancelar canje",
      message: `«${r.title}» se cancela y la clienta conserva sus ${r.cost} Cisnes.`,
      confirmText: "Cancelar canje",
      cancelText: "Volver",
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelRedemption(r.id);
      toast.success("Canje cancelado.");
      await load();
    } catch {
      toast.error("No se pudo cancelar.");
    }
  }

  function renderItem({ item }: { item: Redemption }) {
    const estado = ESTADO[item.status] ?? { label: item.status, color: colors.muted };
    const saldo = saldos[item.patientId] ?? 0;
    const alcanza = saldo >= item.cost;
    return (
      <Card>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>{item.title}</Text>
            <Text style={styles.cliente}>{nombres[item.patientId] ?? "Clienta sin ficha"}</Text>
            <View style={styles.costoRow}>
              <Swan size={13} color={colors.goldDeep} />
              <Text style={styles.costo}>{item.cost}</Text>
              <Text style={styles.costoUnidad}>Cisnes</Text>
              {item.status === "pending" && !alcanza ? (
                <Text style={styles.insuficiente}>· saldo insuficiente ({saldo})</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.derecha}>
            <View style={styles.codigo}>
              <Text style={styles.codigoText}>{item.code}</Text>
            </View>
            <Pill label={estado.label} color={estado.color} />
          </View>
        </View>

        <Text style={styles.fecha}>
          {/* "Hoy" y "Mañana" no llevan "el" delante. */}
          {(() => {
            const d = etiquetaDia(new Date(item.date));
            return /^(Hoy|Mañana)$/.test(d) ? `Apartado ${d.toLowerCase()}` : `Apartado el ${d.toLowerCase()}`;
          })()}
        </Text>

        {item.status === "pending" ? (
          <View style={styles.acciones}>
            <Pressable
              onPress={() => onEntregar(item)}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>Entregar</Text>
            </Pressable>
            <Pressable onPress={() => onCancelar(item)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.cancelar}>Cancelar</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <View style={styles.root}>
      <SectionList
        sections={secciones}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <Text style={styles.seccion}>{section.title}</Text>
        )}
        ListHeaderComponent={
          <ScreenHeader
            title="Canjes"
            subtitle={
              pendientes > 0
                ? `${pendientes} ${pendientes === 1 ? "recompensa espera" : "recompensas esperan"} entrega.`
                : "Nada pendiente de entregar."
            }
            onBack={back}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : (
            <EmptyState
              title="Todavía no hay canjes"
              message="Cuando una clienta canjee Cisnes desde la app, aparecerá aquí para que se lo entregues."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  seccion: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  top: { flexDirection: "row", gap: spacing.md },
  titulo: { fontSize: font.size.lg, color: colors.textOnCard, fontFamily: fonts.medium },
  cliente: { fontSize: font.size.sm, color: colors.subtleOnCard, fontFamily: fonts.regular, marginTop: 2 },
  costoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" },
  costo: { fontSize: font.size.md, color: colors.goldDeep, fontFamily: fonts.extrabold },
  costoUnidad: { fontSize: font.size.xs, color: colors.goldDeep, fontFamily: fonts.semibold },
  insuficiente: { fontSize: font.size.xs, color: colors.danger, fontFamily: fonts.semibold },
  derecha: { alignItems: "flex-end", gap: 6 },
  codigo: {
    backgroundColor: colors.ground,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  codigoText: {
    color: colors.goldSoft,
    fontFamily: fonts.extrabold,
    fontSize: font.size.sm,
    letterSpacing: 1,
  },
  fecha: { fontSize: font.size.xs, color: colors.muted, fontFamily: fonts.regular, marginTop: 8 },
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardLine,
  },
  btn: {
    backgroundColor: colors.ground,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  btnText: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: font.size.sm },
  cancelar: { color: colors.danger, fontSize: font.size.sm, fontFamily: fonts.bold },
});
