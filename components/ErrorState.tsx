import { View } from "react-native";
import { CircleAlert } from "lucide-react-native";

import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ErrorStateProps = {
  /** Error message to display. */
  message: string;
  /** Optional retry callback. */
  onRetry?: () => void;
  /** Label for the retry button. Defaults to "Try Again". */
  retryLabel?: string;
};

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

/**
 * Error state with an icon, message, and optional retry button.
 * Use in place of inline error blocks for failed data loads.
 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try Again",
}: ErrorStateProps) {
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
      <CircleAlert size={48} color={colors.danger} strokeWidth={1.5} />

      <ThemedText muted style={{ textAlign: "center" }}>
        {message}
      </ThemedText>

      {onRetry ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}