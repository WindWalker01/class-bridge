import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = Omit<PressableProps, "style"> & {
  /** Visual style. */
  variant?: Variant;
  /** Full-width layout. */
  fullWidth?: boolean;
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
};

const backgroundFor = (variant: Variant): string => {
  switch (variant) {
    case "primary":
      return colors.primary;
    case "secondary":
      return colors.white;
    case "ghost":
      return "transparent";
  }
};

const textColorFor = (variant: Variant): string => {
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
 */
export function Button({
  variant = "primary",
  fullWidth = false,
  loading = false,
  label,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[
        {
          backgroundColor: backgroundFor(variant),
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        variant === "secondary" && {
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColorFor(variant)} size="small" />
      ) : (
        <Text
          style={[
            typography.body,
            { color: textColorFor(variant), fontWeight: "600" },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
