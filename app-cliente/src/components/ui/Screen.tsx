import React, { useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, radius, font, fonts } from "@/theme";

// Chrome compartido de las pantallas. Antes cada pantalla definía su propio
// encabezado, tarjeta y estado vacío a mano, y los tamaños se iban separando
// entre una y otra. Estas piezas son la única definición.

// Encabezado: título serif + subtítulo, con retroceso y acción opcionales.
// `onBack` reemplaza al header del navigator en las pantallas de un stack —
// tener los dos hacía que el nombre de la pantalla apareciera dos veces.
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : null}

      <View style={styles.headerText}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Retroceso de la pantalla actual. Se usa junto con headerShown:false para que
// el nombre de la pantalla aparezca una sola vez, en el encabezado de la marca.
export function useBack(): () => void {
  const nav = useNavigation();
  return useCallback(() => {
    if (nav.canGoBack()) nav.goBack();
  }, [nav]);
}

// Etiqueta de sección en versalitas.
export function SectionLabel({ children, style }: { children: string; style?: ViewStyle }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// Tarjeta blanca estándar.
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Estado vacío. Un título y una frase que dice qué hacer, no solo "no hay nada".
export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
    </View>
  );
}

export function Loader({ style }: { style?: ViewStyle }) {
  return <ActivityIndicator color={colors.gold} style={[{ marginTop: spacing.xxl }, style]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  back: { padding: 2, marginLeft: -4 },
  headerCompact: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerText: { flex: 1 },
  title: {
    fontSize: font.size.display - 8,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  titleCompact: { fontSize: font.size.xl, fontFamily: fonts.displayRegular, letterSpacing: 0 },
  subtitle: {
    fontSize: font.size.sm,
    color: colors.muted,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  action: {
    backgroundColor: colors.ground,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
  },
  actionText: { color: colors.goldSoft, fontFamily: fonts.bold, fontSize: font.size.sm },
  sectionLabel: {
    fontSize: font.size.xs,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: fonts.semibold,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  empty: { alignItems: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: {
    fontSize: font.size.lg,
    fontFamily: fonts.semibold,
    color: colors.subtleOnCard,
    textAlign: "center",
  },
  emptyText: {
    fontSize: font.size.sm,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 19,
    maxWidth: 280,
  },
});
