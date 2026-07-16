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
import { colors, spacing, radius, font } from "@/theme";
import type { Product } from "@/lib/types";

export function ShopScreen() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "products"), where("active", "==", true)),
        );
        const rows: Product[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: (d.name as string) ?? "",
            description: (d.description as string) ?? "",
            price: typeof d.price === "number" ? d.price : 0,
            sessions: typeof d.sessions === "number" ? d.sessions : undefined,
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

  function onBuy(product: Product) {
    // TODO: integración Stripe
    Alert.alert(
      "Compra",
      "El pago con tarjeta estará disponible pronto (Stripe).",
    );
  }

  function renderItem({ item }: { item: Product }) {
    // Subtítulo: sesiones si existen, si no la descripción.
    const meta =
      typeof item.sessions === "number"
        ? `${item.sessions} ${item.sessions === 1 ? "sesión" : "sesiones"}`
        : item.description;
    return (
      <View style={styles.row}>
        {/* Placeholder de imagen hasta tener imageUrl real */}
        <View style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>
            ${item.price.toLocaleString("es-MX")}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.buyBtn, pressed && { opacity: 0.9 }]}
            onPress={() => onBuy(item)}
          >
            <Text style={styles.buyText}>Comprar</Text>
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
            <Text style={styles.title}>Comprar</Text>
            <Text style={styles.subtitle}>
              Paga en línea y agenda tu cita. Ganas Cisnes.
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
            <Text style={styles.empty}>Pronto habrá servicios disponibles.</Text>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Text style={styles.footer}>Pago seguro con tarjeta · Stripe</Text>
          ) : null
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.rose,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: font.size.md,
    fontWeight: "400",
    color: colors.textOnCard,
  },
  meta: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  price: {
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textOnCard,
  },
  buyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  buyText: {
    color: "#231b06",
    fontWeight: "700",
    fontSize: font.size.xs,
    letterSpacing: 0.5,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.xs,
    marginTop: spacing.lg,
  },
});
