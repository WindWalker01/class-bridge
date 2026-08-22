import {
  useState,
} from "react";
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Optional icon rendered inside the field, before the input. */
  leftIcon?: React.ReactNode;
  /** Optional element rendered inside the field, after the input (e.g. an eye toggle). */
  rightSlot?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Themed text input with an optional label, error message, icon slots and a
 * focus ring. Designed to be controlled by react-hook-form.
 */
export function TextField({
  label,
  error,
  leftIcon,
  rightSlot,
  containerStyle,
  style,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceElevated,
        }}
      >
        {leftIcon ? (
          <View style={{ paddingLeft: spacing.md }}>{leftIcon}</View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              color: colors.text,
              fontSize: typography.body.fontSize,
            },
            style,
          ]}
          {...rest}
        />
        {rightSlot ? (
          <View style={{ paddingRight: spacing.sm }}>{rightSlot}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={[typography.small, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
