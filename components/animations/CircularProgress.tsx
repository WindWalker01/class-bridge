/**
 * CircularProgress — a Reanimated + react-native-svg circular progress ring.
 * Used for the timed question countdown and the results score reveal.
 *
 * Animates strokeDashoffset and supports color transitions as progress changes.
 */
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircularProgressProps = {
  /** Progress value 0–100 (percentage). */
  progress: number;
  /** Diameter of the ring. Default 64. */
  size?: number;
  /** Thickness of the stroke. Default 6. */
  strokeWidth?: number;
  /** Color for the full-progress state. Default colors.success. */
  activeColor?: string;
  /** Color when progress drops below `warningThreshold` (e.g. 30%). Default colors.warning. */
  warningColor?: string;
  /** Color when progress drops below `dangerThreshold` (e.g. 10%). Default colors.danger. */
  dangerColor?: string;
  /** Thresholds for color transitions. */
  warningThreshold?: number;
  dangerThreshold?: number;
  /** Track color (background ring). Default colors.surfaceMuted. */
  trackColor?: string;
  /** Duration of the animated transition in ms. Default 300. */
  duration?: number;
  /** Whether to render children within the ring (e.g. text label). */
  children?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// AnimatedCircle — reanimated-driven SVG Circle
// ---------------------------------------------------------------------------

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CircularProgress({
  progress,
  size = 64,
  strokeWidth = 6,
  activeColor = colors.success,
  warningColor = colors.warning,
  dangerColor = colors.danger,
  warningThreshold = 30,
  dangerThreshold = 10,
  trackColor = colors.surfaceMuted,
  duration = 300,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const halfSize = size / 2;

  // Shared values for animation
  const animatedProgress = useSharedValue(0);
  const animatedColor = useSharedValue(activeColor);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration,
    });

    // Determine color based on thresholds
    let targetColor = activeColor;
    if (progress <= dangerThreshold) {
      targetColor = dangerColor;
    } else if (progress <= warningThreshold) {
      targetColor = warningColor;
    }
    animatedColor.value = withTiming(targetColor, { duration });
  }, [
    progress,
    activeColor,
    warningColor,
    dangerColor,
    warningThreshold,
    dangerThreshold,
    duration,
    animatedProgress,
    animatedColor,
  ]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
      stroke: animatedColor.value,
    };
  }, [circumference]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={halfSize}
          cy={halfSize}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={halfSize}
          cy={halfSize}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${halfSize} ${halfSize})`}
          animatedProps={animatedProps as any}
        />
      </Svg>
      {/* Center content */}
      {children && (
        <View style={{ position: "absolute" }}>{children}</View>
      )}
    </View>
  );
}