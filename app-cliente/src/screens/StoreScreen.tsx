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
    const agotado = typeof item.stock === "number" && item.stock <= 0;
    return (
      <View style={styles.card}>
        {/* Imagen (pendiente de subir desde el admin) */}
        <View style={styles.cardImage}>
          <Swan size={26} color="rgba(255,255,255,0.75)" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.price}>${item.price.toLocaleString("es-MX")}</Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {typeof item.stock === "number" ? (
            <Text style={[styles.stock, agotado && styles.stockOut]}>
              {agotado ? "Agotado" : `${item.stock} disponibles`}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              agotado ? styles.buyBtnOff : styles.buyBtn,
              pressed && !agotado && { opacity: 0.9 },
            ]}
            onPress={() => onBuy(item)}
            disabled={agotado}
          >
            <Text style={agotado ? styles.buyTextOff : styles.buyText}>
              {agotado ? "Agotado" : "Comprar"}
            </Text>
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
        numColumns={2}
        columnWrapperStyle={styles.row}
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
  row: { gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    shadowColor: "#2b2118",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    height: 104,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: spacing.md, flex: 1 },
  cardTitle: {
    fontSize: font.size.md,
    fontWeight: "600",
    color: colors.textOnCard,
    lineHeight: 19,
  },
  price: {
    color: colors.goldDeep,
    fontWeight: "800",
    fontSize: font.size.lg,
    marginTop: 4,
  },
  cardDesc: {
    color: colors.subtleOnCard,
    fontSize: font.size.xs,
    marginTop: 4,
    lineHeight: 16,
    minHeight: 32,
  },
  stock: { color: colors.muted, fontSize: font.size.xs, marginTop: 4 },
  stockOut: { color: colors.danger, fontWeight: "700" },
  buyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buyText: {
    color: "#231b06",
    fontWeight: "700",
    fontSize: font.size.sm,
    letterSpacing: 0.3,
  },
  buyBtnOff: {
    backgroundColor: "#eee9dd",
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buyTextOff: { color: colors.subtleOnCard, fontWeight: "600", fontSize: font.size.sm },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl,
  },
});
