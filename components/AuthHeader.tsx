/**
 * AuthHeader — branded logo + title + subtitle for authentication screens.
 */
import { GraduationCap } from "lucide-react-native";
import { View } from "react-native";

import { radii, shadows, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors, accent } = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.md,
      }}
    >
      <View
        style={[
          {
            width: 72,
            height: 72,
            borderRadius: radii.lg,
            backgroundColor: accent.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.xs,
          },
          shadows.md,
        ]}
      >
        <GraduationCap size={40} color={colors.white} strokeWidth={1.8} />
      </View>
      <ThemedText variant="display" style={{ textAlign: "center" }}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText muted style={{ textAlign: "center" }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}
