import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useToast, useConfirm } from "@/components/ui/UIProvider";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Swan } from "@/components/Swan";
import { colors, spacing, radius, font, fonts } from "@/theme";
import type { StoreProduct } from "@/lib/types";

export function StoreScreen() {
  const { patient } = useAuth();
  const storeEnabled = patient?.storeEnabled ?? false;
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const confirm = useConfirm();

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
            stripePaymentLink: (d.stripePaymentLink as string) || undefined,
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

  // Al volver de Stripe (…/?pago=ok) confirmamos aquí mismo. En web la liga
  // regresa a esta URL; en la app nativa se abre en el navegador seguro.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const params = new URLSearchParams(window.location.search);
    const estado = params.get("pago");
    if (!estado) return;
    if (estado === "ok") toast.success("¡Pago recibido! Te contactaremos para la entrega.");
    else toast.info("El pago no se completó. Puedes intentarlo de nuevo.");
    // Limpia la URL para que un refresh no repita el aviso.
    window.history.replaceState({}, "", window.location.pathname);
  }, [toast]);

  async function onBuy(product: StoreProduct) {
    if (!product.stripePaymentLink) {
      toast.info("Este producto aún no tiene pago en línea. Pregunta en la clínica.");
      return;
    }
    const ok = await confirm({
      title: "Pagar con tarjeta",
      message: `${product.name} · $${product.price.toLocaleString("es-MX")}. Se abre la página de pago segura de Stripe.`,
      confirmText: "Ir a pagar",
    });
    if (!ok) return;

    // client_reference_id deja rastro de quién pagó, para el registro
    // automático cuando el webhook esté conectado.
    const url = new URL(product.stripePaymentLink);
    if (patient?.id) url.searchParams.set("client_reference_id", patient.id);
    if (patient?.email) url.searchParams.set("prefilled_email", patient.email);

    try {
      if (Platform.OS === "web") {
        // Misma pestaña: Stripe regresa a la app con ?pago=ok al terminar.
        window.location.assign(url.toString());
      } else {
        await WebBrowser.openBrowserAsync(url.toString());
      }
    } catch {
      Linking.openURL(url.toString()).catch(() =>
        toast.error("No se pudo abrir la página de pago."),
      );
    }
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
              {agotado ? "Agotado" : item.stripePaymentLink ? "Pagar con tarjeta" : "Comprar"}
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
  lockedTitle: { fontSize: font.size.xl, color: colors.ink, fontFamily: fonts.semibold },
  lockedText: { fontSize: font.size.sm, color: colors.muted, textAlign: "center", lineHeight: 20, fontFamily: fonts.regular },
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
    fontFamily: fonts.semibold,
    color: colors.textOnCard,
    lineHeight: 19,
  },
  price: {
    color: colors.goldDeep,
    fontFamily: fonts.extrabold,
    fontSize: font.size.lg,
    marginTop: 4,
  },
  cardDesc: {
    color: colors.subtleOnCard,
    fontSize: font.size.xs,
    marginTop: 4,
    lineHeight: 16,
    minHeight: 32, fontFamily: fonts.regular },
  stock: { color: colors.muted, fontSize: font.size.xs, marginTop: 4, fontFamily: fonts.regular },
  stockOut: { color: colors.danger, fontFamily: fonts.bold },
  buyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buyText: {
    color: "#231b06",
    fontFamily: fonts.bold,
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
  buyTextOff: { color: colors.subtleOnCard, fontFamily: fonts.semibold, fontSize: font.size.sm },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    marginTop: spacing.xxl, fontFamily: fonts.regular },
});
