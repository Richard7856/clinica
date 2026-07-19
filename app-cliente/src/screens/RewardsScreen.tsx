import React, { useEffect, useState } from "react";
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
import { colors, spacing, radius, font } from "@/theme";
import type { RewardItem } from "@/lib/types";

export function RewardsScreen() {
  const { patient, refreshPatient } = useAuth();
  const points = patient?.points ?? 0;

  const [items, setItems] = useState<RewardItem[]>([]);
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
    return (
      <View style={styles.card}>
        {/* Placeholder de imagen hasta tener imageUrl real */}
        <View style={styles.cardHeader} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.costRow}>
            <Swan size={14} color={colors.goldDeep} />
            <Text style={styles.costText}>{item.cost} Cisnes</Text>
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>

          <Pressable
            style={({ pressed }) => [
              canRedeem ? styles.redeemBtn : styles.redeemBtnDisabled,
              pressed && canRedeem && { opacity: 0.9 },
            ]}
            onPress={() => onRedeem(item)}
            disabled={!canRedeem || busy}
          >
            <Text
              style={canRedeem ? styles.redeemText : styles.redeemTextDisabled}
            >
              {busy
                ? "Canjeando…"
                : canRedeem
                  ? "Canjear recompensa"
                  : `Te faltan ${item.cost - points} Cisnes`}
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Recompensas</Text>
            <Text style={styles.subtitle}>
              Canjea tus Cisnes por estos beneficios.
            </Text>
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
    fontWeight: "300",
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  cardHeader: {
    height: 96,
    backgroundColor: colors.rose,
  },
  cardBody: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: font.size.xl,
    fontWeight: "400",
    color: colors.textOnCard,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  costText: {
    color: colors.goldDeep,
    fontWeight: "700",
    fontSize: font.size.md,
  },
  cardDesc: {
    color: colors.subtleOnCard,
    fontSize: font.size.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  redeemBtn: {
    backgroundColor: colors.ground,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  redeemText: {
    color: colors.goldSoft,
    fontWeight: "700",
    fontSize: font.size.md,
    letterSpacing: 0.5,
  },
  redeemBtnDisabled: {
    backgroundColor: "#eee9dd",
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  redeemTextDisabled: {
    color: colors.subtleOnCard,
    fontWeight: "600",
    fontSize: font.size.md,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
