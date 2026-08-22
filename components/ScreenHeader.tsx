import { View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconButton, type LucideIcon } from "@/components/IconButton";
import { radii, shadows, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScreenHeaderProps = {
  /** Title text (required). */
  title: string;
  /** Optional subtitle displayed below the title. */
  subtitle?: string;
  /** Back arrow handler. Typically `() => router.back()`. */
  onBack?: () => void;
  /** Optional element rendered on the right side (e.g. an IconButton or Badge). */
  rightAction?: React.ReactNode;
  /** Optional icon override for the back button. Defaults to ArrowLeft. */
  backIcon?: LucideIcon;
};

// ---------------------------------------------------------------------------
// ScreenHeader
// ---------------------------------------------------------------------------

/**
 * Consolidates the repeated "back arrow + title + subtitle + optional right
 * action" pattern used across class feed, quizzes, gradebook, etc.
 *
 * Visual design: a rounded elevated card with a role-accent stripe on the left
 * edge, a tinted circular back chip, and a clear title/subtitle hierarchy.
 * Fully token-driven so it adapts to light/dark mode and teacher/student roles.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  backIcon: BackIcon = ArrowLeft,
}: ScreenHeaderProps) {
  const { colors, accent } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
      }}
    >
      {/* Elevated header card */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.md,
          paddingLeft: onBack ? spacing.md : spacing.lg,
          paddingRight: spacing.md,
          overflow: "hidden",
          ...shadows.sm,
        }}
      >
        {/* Accent stripe */}
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 4,
            backgroundColor: accent.accent,
          }}
        />

        {onBack && (
          <IconButton
            icon={BackIcon}
            onPress={onBack}
            color={accent.accentText}
            size={22}
            backgroundColor={accent.accentSoft}
          />
        )}

        <View style={{ flex: 1 }}>
          <ThemedText variant="title" numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={{ color: accent.accentText, marginTop: 2 }}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        {rightAction ?? null}
      </View>
    </View>
  );
}