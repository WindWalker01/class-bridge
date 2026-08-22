import { Text, type TextProps } from "react-native";

import { typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type Variant = keyof typeof typography;

type ThemedTextProps = TextProps & {
  /** Typographic variant. Defaults to "body". */
  variant?: Variant;
  /** Muted/secondary text color. */
  muted?: boolean;
};

/**
 * Text component bound to the theme's typographic scale and palette.
 */
export function ThemedText({
  variant = "body",
  muted = false,
  style,
  ...rest
}: ThemedTextProps) {
  const { colors } = useTheme();
  const variantStyle = typography[variant];

  return (
    <Text
      style={[
        variantStyle,
        { color: muted ? colors.textMuted : colors.text },
        style,
      ]}
      {...rest}
    />
  );
}
