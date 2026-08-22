import type { ComponentType } from "react";
import { type PressableProps, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import type { SvgProps } from "react-native-svg";

import { usePressAnimation } from "@/components/animations";
import { radii } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal lucide icon type. Lucide icons are SVG components that accept
 * size, color, and strokeWidth props along with standard SvgProps.
 */
export type LucideIcon = ComponentType<
  SvgProps & { size?: number; strokeWidth?: number }
>;

export type IconButtonVariant = "ghost" | "filled";

export type IconButtonProps = Omit<PressableProps, "style"> & {
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Icon size in logical pixels. Defaults to 24. */
  size?: number;
  /** Icon color. Defaults depend on variant. */
  color?: string;
  /** Background variant. Defaults to "ghost" (transparent). */
  variant?: IconButtonVariant;
  /** Explicit background color override (overrides variant). */
  backgroundColor?: string;
  /** Renders a round button. Defaults to true for consistency. */
  round?: boolean;
  /** Extra container style. */
  style?: ViewStyle;
};

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

/**
 * A themed pressable wrapper around a lucide icon. Use for back arrows,
 * remove buttons, FABs, and any standalone icon action.
 *
 * Ensures a minimum 44×44 touch target per accessibility guidelines.
 * Features subtle scale-down + opacity animation on press with haptic feedback.
 */
export function IconButton({
  icon: Icon,
  size = 24,
  color,
  variant = "ghost",
  backgroundColor,
  round = true,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const dim = Math.max(size + 20, 44); // ensure 44pt minimum touch target

  const bg =
    backgroundColor ?? (variant === "filled" ? colors.primary : "transparent");

  const iconColor =
    color ?? (variant === "filled" ? colors.white : colors.textMuted);

  const { animatedStyle, pressIn, pressOut } = usePressAnimation({
    hapticOnPress: !disabled,
  });

  const { onPress, ...otherRest } = rest;

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: round ? dim / 2 : radii.md,
    backgroundColor: bg,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <Animated.View
      style={{
        ...containerStyle,
        ...(!disabled ? (animatedStyle as any) : {}),
        ...(style as any),
      }}
      onTouchStart={!disabled ? pressIn : undefined}
      onTouchEnd={
        !disabled
          ? (e) => {
              pressOut();
              onPress?.(e);
            }
          : undefined
      }
      onTouchCancel={!disabled ? pressOut : undefined}
      accessibilityRole="button"
      {...(otherRest as any)}
    >
      <Icon size={size} color={iconColor} strokeWidth={1.8} />
    </Animated.View>
  );
}
