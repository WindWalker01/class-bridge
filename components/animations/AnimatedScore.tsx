/**
 * AnimatedScore — a count-up animated number text.
 * Uses Reanimated shared values to tween between previous and new values
 * with `withTiming`, rendering the interpolated value on the UI thread via
 * `useAnimatedProps` on a native Animated.Text element.
 */
import { useEffect, useRef } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, typography } from "@/constants/theme";

// ---------------------------------------------------------------------------
// AnimatedText — reanimated-driven Text node
// ---------------------------------------------------------------------------

const AnimatedText = Animated.createAnimatedComponent(Text);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimatedScoreProps = {
  /** The target numeric value to display. */
  value: number;
  /** Duration of the count-up animation in ms. Default 400. */
  duration?: number;
  /** Optional style overrides. */
  style?: any;
  /** Optional suffix appended after the rounded number (e.g. " pts" or "%"). */
  suffix?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnimatedScore({
  value,
  duration = 400,
  style,
  suffix = "",
}: AnimatedScoreProps) {
  const animatedValue = useSharedValue(value);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      animatedValue.value = withTiming(value, { duration });
    }
  }, [value, duration, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${String(Math.round(animatedValue.value))}${suffix}`,
    } as any;
  }, []);

  return (
    <AnimatedText
      animatedProps={animatedProps as any}
      style={[{ color: colors.text }, style]}
    />
  );
}