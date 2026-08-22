import { View } from "react-native";
import { Inbox } from "lucide-react-native";

import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import type { LucideIcon } from "@/components/IconButton";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmptyStateProps = {
  /** Optional lucide icon (defaults to Inbox). */
  icon?: LucideIcon;
  /** Primary heading. */
  title: string;
  /** Secondary descriptive text. */
  message?: string;
  /** Label for the optional CTA button. */
  actionLabel?: string;
  /** Callback when the CTA is pressed. */
  onAction?: () => void;
};

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

/**
 * Centered empty-state placeholder with icon, heading, subtext, and optional
 * CTA button. Replaces the duplicated `renderEmpty` blocks across screens.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: spacing.xxl,
        gap: spacing.md,
      }}
    >
      <Icon size={48} color={colors.textSubtle} strokeWidth={1.5} />

      <ThemedText variant="heading" muted style={{ textAlign: "center" }}>
        {title}
      </ThemedText>

      {message ? (
        <ThemedText muted style={{ textAlign: "center" }}>
          {message}
        </ThemedText>
      ) : null}

      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}