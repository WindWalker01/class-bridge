import type { PropsWithChildren } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { radii, shadows, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { usePressAnimation } from "@/components/animations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardVariant = "flat" | "elevated";
export type CardPadding = keyof typeof spacing | "none";

export type CardProps = PropsWithChildren<{
  /** Visual style. "flat" uses border + surface background; "elevated" uses shadow + white. */
  variant?: CardVariant;
  /** Padding size. Defaults to "md". Use "none" for custom padding. */
  padding?: CardPadding;
  /** Optional press handler — renders an animated card when provided. */
  onPress?: () => void;
  style?: ViewStyle;
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const paddingValue = (p: CardPadding): number | undefined =>
  p === "none" ? undefined : spacing[p];

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/**
 * A themed card surface. Use `flat` for lists of items (the dominant pattern
 * in the codebase) and `elevated` for content that needs to feel raised
 * (e.g. FAB panels, dialogs, hero cards).
 *
 * When `onPress` is provided, the card becomes pressable with a subtle
 * scale-down animation.
 */
export function Card({
  variant = "flat",
  padding = "md",
  onPress,
  style,
  children,
}: CardProps) {
  const { colors } = useTheme();
  const pad = paddingValue(padding);
  const { animatedStyle, pressIn, pressOut } = usePressAnimation();

  const cardStyle: ViewStyle = {
    backgroundColor: variant === "elevated" ? colors.surfaceElevated : colors.surface,
    borderRadius: radii.lg,
    ...(variant === "flat"
      ? { borderWidth: 1, borderColor: colors.border }
      : { ...(shadows.md as ViewStyle) }),
    ...(pad !== undefined ? { padding: pad } : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={style}
      >
        <Animated.View style={{ ...cardStyle, ...(animatedStyle as any) } as any}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}