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
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font } from "@/theme";
import type { StoreProduct } from "@/lib/types";

export function StoreScreen() {
  const { patient } = useAuth();
  const storeEnabled = patient?.storeEnabled ?? false;
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga los productos físicos activos de la tienda.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "storeProducts"), where("active", "==", true)),
        );
        const rows: StoreProduct[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: (d.name as string) ?? "",
            description: (d.description as string) ?? "",
            price: typeof d.price === "number" ? d.price : 0,
            stock: typeof d.stock === "number" ? d.stock : undefined,
            imageUrl: d.imageUrl as string | undefined,
            active: Boolean(d.active),
          };
        });
        if (active) setProducts(rows);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function onBuy(product: StoreProduct) {
    const priceLabel = `$${product.price.toLocaleString("es-MX")}`;
    Alert.alert(
      "Compra de demostración",
      `¿Comprar ${product.name} por ${priceLabel}? (No se cobra nada.)`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Comprar",
          style: "default",
          onPress: () => {
            // TODO: pago real + registro de pedido
            Alert.alert(
              "¡Compra simulada!",
              "Te contactaremos para la entrega.",
            );
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: StoreProduct }) {
    return (
      <View style={styles.card}>
        {/* Placeholder de imagen hasta tener imageUrl real */}
        <View style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.price}>
            ${item.price.toLocaleString("es-MX")}
          </Text>
          {item.description ? (
            <Text style={styles.cardDesc}>{item.description}</Text>
          ) : null}
          {typeof item.stock === "number" ? (
            <Text style={styles.stock}>
              {item.stock > 0 ? `${item.stock} disponibles` : "Agotado"}
            </Text>
          ) : null}

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

  // La tienda no es para todos: el admin habilita el acceso por usuario.
  if (!storeEnabled) {
    return (
      <View style={[styles.root, styles.locked]}>
        <Swan size={56} color={colors.muted} />
        <Text style={styles.lockedTitle}>Tienda no disponible</Text>
        <Text style={styles.lockedText}>
          El acceso a la tienda está habilitado solo para clientes seleccionados.
          Pregunta en la clínica para activarlo en tu cuenta.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={products}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Tienda</Text>
            <Text style={styles.subtitle}>Productos para llevarte a casa.</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <Text style={styles.empty}>Pronto habrá productos.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  locked: { alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  lockedTitle: { fontSize: font.size.xl, color: colors.ink, fontWeight: "600" },
  lockedText: { fontSize: font.size.sm, color: colors.muted, textAlign: "center", lineHeight: 20 },
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
  cardImage: {
    height: 120,
    backgroundColor: colors.rose,
    borderRadius: radius.md,
  },
  cardBody: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: font.size.lg,
    fontWeight: "400",
    color: colors.textOnCard,
  },
  price: {
    color: colors.goldDeep,
    fontWeight: "700",
    fontSize: font.size.lg,
    marginTop: spacing.xs,
  },
  cardDesc: {
    color: colors.subtleOnCard,
    fontSize: font.size.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  stock: {
    color: colors.muted,
    fontSize: font.size.xs,
    marginTop: spacing.sm,
  },
  buyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buyText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: font.size.md,
    letterSpacing: 0.5,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
