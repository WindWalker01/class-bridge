import { View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconButton, type LucideIcon } from "@/components/IconButton";
import { spacing } from "@/constants/theme";
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
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  backIcon: BackIcon = ArrowLeft,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
      }}
    >
      {onBack && (
        <IconButton
          icon={BackIcon}
          onPress={onBack}
          color={colors.text}
          size={24}
        />
      )}

      <View style={{ flex: 1 }}>
        <ThemedText variant="heading" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="small" muted>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {rightAction ?? null}
    </View>
  );
}