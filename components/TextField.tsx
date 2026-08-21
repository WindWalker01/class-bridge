import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing, typography } from "@/constants/theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Lightweight themed text input with an optional label and error message.
 * Designed to be controlled by react-hook-form.
 */
export function TextField({
  label,
  error,
  containerStyle,
  style,
  ...rest
}: TextFieldProps) {
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            color: colors.text,
            fontSize: typography.body.fontSize,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[typography.small, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
