import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { redeemReward } from "@/lib/rewards";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { RewardItem } from "@/lib/types";

export function RewardsScreen() {
  const { patient, refreshPatient } = useAuth();
  const points = patient?.points ?? 0;

  const [items, setItems] = useState<RewardItem[]>([]);
  const siguiente = useMemo(
    () => items.filter((r) => r.cost > points).sort((a, b) => a.cost - b.cost)[0] ?? null,
    [items, points],
  );
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "rewardItems"), where("active", "==", true)),
        );
        const rows: RewardItem[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: (d.title as string) ?? "",
            description: (d.description as string) ?? "",
            cost: typeof d.cost === "number" ? d.cost : 0,
            imageUrl: d.imageUrl as string | undefined,
            active: Boolean(d.active),
          };
        });
        if (active) setItems(rows);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function onRedeem(item: RewardItem) {
    if (!patient) {
      Alert.alert(
        "Sin ficha",
        "No encontramos tu ficha en la clínica. Pide que registren tu correo.",
      );
      return;
    }
    Alert.alert(
      "Canjear recompensa",
      `¿Canjear "${item.title}" por ${item.cost} Cisnes?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Canjear",
          style: "default",
          onPress: async () => {
            setRedeemingId(item.id);
            try {
              const { code } = await redeemReward(patient.id, item);
              await refreshPatient();
              Alert.alert(
                "¡Canjeado!",
                `Muestra este código en recepción para reclamar tu recompensa:\n\n${code}`,
              );
            } catch (e) {
              Alert.alert(
                "No se pudo canjear",
                e instanceof Error ? e.message : "Intenta de nuevo.",
              );
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: RewardItem }) {
    const canRedeem = points >= item.cost;
    const busy = redeemingId === item.id;
    const faltan = item.cost - points;
    return (
      <View style={styles.card}>
        {/* Imagen (pendiente de subir desde el admin) */}
        <View style={styles.cardHeader}>
          <Swan size={26} color="rgba(255,255,255,0.75)" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.costRow}>
            <Swan size={13} color={colors.goldDeep} />
            <Text style={styles.costText}>{item.cost}</Text>
            <Text style={styles.costUnit}>Cisnes</Text>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>

          <Pressable
            style={({ pressed }) => [
              canRedeem ? styles.redeemBtn : styles.redeemBtnDisabled,
              pressed && canRedeem && { opacity: 0.9 },
            ]}
            onPress={() => onRedeem(item)}
            disabled={!canRedeem || busy}
          >
            <Text style={canRedeem ? styles.redeemText : styles.redeemTextDisabled}>
              {busy ? "Canjeando…" : canRedeem ? "Canjear" : `Faltan ${faltan}`}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Tus Cisnes</Text>

            <View style={styles.balance}>
              <View style={styles.balanceRow}>
                <Swan size={30} color={colors.goldSoft} />
                <Text style={styles.balanceNum}>{points}</Text>
              </View>
              {siguiente ? (
                <>
                  <View style={styles.bar}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.min(100, Math.round((points / siguiente.cost) * 100))}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.balanceCap}>
                    Te faltan {siguiente.cost - points} para «{siguiente.title}»
                  </Text>
                </>
              ) : (
                <Text style={styles.balanceCap}>
                  {points > 0
                    ? "Ya alcanzas todas las recompensas del catálogo."
                    : "Acumula Cisnes en cada visita a la clínica."}
                </Text>
              )}
            </View>

            <Text style={styles.sectionLbl}>QUÉ PUEDES CANJEAR</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>
              Aún no hay recompensas disponibles.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: font.size.display - 8,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.muted,
    marginTop: spacing.xs, fontFamily: fonts.regular },
  balance: {
    backgroundColor: colors.ground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  balanceNum: { fontSize: 44, color: colors.cream, fontFamily: fonts.display, lineHeight: 50 },
  bar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  barFill: { height: "100%", backgroundColor: colors.gold },
  balanceCap: {
    fontSize: font.size.sm,
    color: "#b7b1a5",
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  sectionLbl: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
    marginTop: spacing.xl,
  },
  row: { gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    // Sombra suave: da profundidad sin ensuciar el look editorial.
    shadowColor: "#2b2118",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    height: 96,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: spacing.md, flex: 1 },
  cardTitle: {
    fontSize: font.size.md,
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
    lineHeight: 19,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  costText: { color: colors.goldDeep, fontFamily: fonts.extrabold, fontSize: font.size.md },
  costUnit: { color: colors.goldDeep, fontFamily: fonts.semibold, fontSize: font.size.xs },
  cardDesc: {
    color: colors.subtleOnCard,
    fontSize: font.size.xs,
    marginTop: 4,
    lineHeight: 16,
    minHeight: 32, fontFamily: fonts.regular },
  redeemBtn: {
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.md,
  },
  redeemText: {
    color: colors.goldSoft,
    fontFamily: fonts.bold,
    fontSize: font.size.sm,
    letterSpacing: 0.3,
  },
  redeemBtnDisabled: {
    backgroundColor: "#eee9dd",
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.md,
  },
  redeemTextDisabled: {
    color: colors.subtleOnCard,
    fontFamily: fonts.semibold,
    fontSize: font.size.sm,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
