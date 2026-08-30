import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BackHeader } from "@/components/BackHeader";
import { PromoCard } from "@/components/PromoCard";
import { listActivePromotions } from "@/lib/catalog";
import { colors, spacing, font, fonts } from "@/theme";
import type { Promotion } from "@/lib/types";
import type { HomeStackParams } from "@/navigation/Tabs";

type Props = NativeStackScreenProps<HomeStackParams, "Promos">;

// Listado completo de promociones. Inicio solo muestra las primeras en el
// carrusel; el resto vive aquí.
export function PromosScreen({ navigation }: Props) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listActivePromotions()
      .then((rows) => active && setPromos(rows))
      .catch(() => active && setPromos([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <BackHeader title="Promociones" onBack={() => navigation.goBack()} />
      <FlatList
        data={promos}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => (
          <PromoCard promo={item} index={index} />
        )}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
          ) : (
            <Text style={styles.empty}>
              Ahora mismo no hay promociones activas. Vuelve pronto.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontSize: font.size.md,
    fontFamily: fonts.regular,
    marginTop: spacing.xxl,
    lineHeight: 21,
  },
});
