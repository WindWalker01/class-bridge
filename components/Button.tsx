import {
  ActivityIndicator,
  Text,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";

import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { usePressAnimation } from "@/components/animations";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = Omit<PressableProps, "style"> & {
  /** Visual style. */
  variant?: Variant;
  /** Full-width layout. */
  fullWidth?: boolean;
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
  label: string;
  /** Optional icon rendered before the label. */
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const backgroundFor = (variant: Variant, colors: any): string => {
  switch (variant) {
    case "primary":
      return colors.primary;
    case "secondary":
      return colors.white;
    case "ghost":
      return "transparent";
  }
};

const textColorFor = (variant: Variant, colors: any): string => {
  switch (variant) {
    case "primary":
      return colors.white;
    case "secondary":
      return colors.text;
    case "ghost":
      return colors.primary;
  }
};

/**
 * Themed pressable button with primary/secondary/ghost variants.
 * Features subtle scale-down + opacity animation on press, plus haptic
 * feedback on primary variant presses.
 */
export function Button({
  variant = "primary",
  fullWidth = false,
  loading = false,
  label,
  leftIcon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const { animatedStyle, pressIn, pressOut } = usePressAnimation({
    hapticOnPress: variant === "primary" && !isDisabled,
  });
  const { onPress, ...otherRest } = rest;

  const handleTouchEnd = (e: GestureResponderEvent) => {
    pressOut();
    onPress?.(e);
  };

  const baseStyle: ViewStyle = {
    backgroundColor: backgroundFor(variant, colors),
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  };

  if (variant === "secondary") {
    (baseStyle as any).borderWidth = 1;
    (baseStyle as any).borderColor = colors.border;
  }

  return (
    <Animated.View
      style={[baseStyle, !isDisabled ? (animatedStyle as any) : {}, style as any]}
      onTouchStart={!isDisabled ? pressIn : undefined}
      onTouchEnd={!isDisabled ? handleTouchEnd : undefined}
      onTouchCancel={!isDisabled ? pressOut : undefined}
      {...otherRest}
    >
      {loading ? (
        <ActivityIndicator color={textColorFor(variant, colors)} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              typography.body,
              { color: textColorFor(variant, colors), fontWeight: "600" },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Animated.View>
  );
}
