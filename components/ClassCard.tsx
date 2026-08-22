/**
 * ClassCard — the shared class card used on both the teacher and student
 * dashboards. Features a subject-initial icon tile in the role's soft accent,
 * an optional badge pill, and a hairline-divided footer row with a chevron
 * affordance when pressable.
 */
import { ChevronRight } from "lucide-react-native";
import { View, type ViewStyle } from "react-native";

import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";

export function ClassCard({
  title,
  subtitle,
  badge,
  footer,
  onPress,
  style,
}: {
  /** Class name. */
  title: string;
  /** Subject (+ optional section) line shown under the title. */
  subtitle: string;
  /** Optional pill rendered at the top-right (e.g. student count). */
  badge?: string;
  /** Optional content rendered in the hairline-divided footer row. */
  footer?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const { colors, accent } = useTheme();
  const initial =
    subtitle.trim().charAt(0).toUpperCase() ||
    title.trim().charAt(0).toUpperCase();

  return (
    <Card variant="elevated" onPress={onPress} style={style}>
      {/* Header row: icon tile + text */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radii.md,
            backgroundColor: accent.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            variant="heading"
            style={{ color: accent.accentText, fontWeight: "700" }}
          >
            {initial}
          </ThemedText>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.sm,
            }}
          >
            <ThemedText variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {title}
            </ThemedText>
            {badge ? (
              <View
                style={{
                  backgroundColor: accent.accentSoft,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 3,
                }}
              >
                <ThemedText
                  variant="small"
                  numberOfLines={1}
                  style={{ color: accent.accentText, fontWeight: "600" }}
                >
                  {badge}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </View>

      {/* Footer row */}
      {footer ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.md,
            paddingTop: spacing.sm + 2,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            {footer}
          </View>
          {onPress ? (
            <ChevronRight size={18} color={colors.textSubtle} strokeWidth={2} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
