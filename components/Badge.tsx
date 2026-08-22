import { Text, View } from "react-native";

import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ColorTokens } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";
export type BadgeSize = "sm" | "md";

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
};

// ---------------------------------------------------------------------------
// Tone palette builder
// ---------------------------------------------------------------------------

function toneColors(tone: BadgeTone, colors: ColorTokens) {
  switch (tone) {
    case "neutral":
      return { bg: colors.surfaceMuted, text: colors.textMuted };
    case "success":
      return { bg: colors.success + "18", text: colors.success };
    case "warning":
      return { bg: colors.warning + "18", text: colors.warning };
    case "danger":
      return { bg: colors.danger + "18", text: colors.danger };
    case "accent":
      return { bg: colors.primaryMuted, text: colors.primary };
  }
}

// ---------------------------------------------------------------------------
// Badge / Pill
// ---------------------------------------------------------------------------

/**
 * A compact label badge. Use for status indicators (quiz status, grade letters),
 * navigation pills, and post-type labels.
 */
export function Badge({
  label,
  tone = "neutral",
  size = "sm",
}: BadgeProps) {
  const { colors } = useTheme();
  const colors_ = toneColors(tone, colors);

  return (
    <View
      style={{
        backgroundColor: colors_.bg,
        borderRadius: radii.pill,
        paddingHorizontal: size === "sm" ? spacing.sm : spacing.md,
        paddingVertical: size === "sm" ? 2 : spacing.xs,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={[
          size === "sm" ? typography.small : typography.caption,
          { color: colors_.text, fontWeight: "600" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}