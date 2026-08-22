import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
};

// ---------------------------------------------------------------------------
// Base Skeleton
// ---------------------------------------------------------------------------

/**
 * A shimmer placeholder that pulses opacity to indicate loading.
 * Uses Reanimated for smooth, jank-free animation on the UI thread.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radii.sm,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1, // infinite loop
      true, // reverse
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceMuted,
        },
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Full-width card skeleton with rounded corners. */
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <Skeleton width="60%" height={20} />
      <Skeleton width="40%" height={14} />
      <Skeleton width="100%" height={14} />
    </View>
  );
}

/** Row skeleton: a circle + two text lines. */
export function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

/** Single or double text line skeleton. */
export function SkeletonText({ lines = 1 }: { lines?: 1 | 2 }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Skeleton width="100%" height={14} />
      {lines === 2 && <Skeleton width="70%" height={14} />}
    </View>
  );
}