/**
 * AnimatedScore — a count-up animated number text.
 * Uses a lightweight JS-thread timer-based approach for broad compatibility,
 * avoiding Reanimated worklet pitfalls with string formatting on the UI thread.
 */
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

/** Cubic ease-out for natural deceleration. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

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
  const { colors } = useTheme();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (value === prevValueRef.current) return;
    const from = prevValueRef.current;
    prevValueRef.current = value;
    const diff = value - from;

    // Kick off a 60 fps timer-based tween
    const startTime = performance.now();

    frameRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setDisplayValue(Math.round(from + diff * eased));

      if (progress >= 1) {
        if (frameRef.current) clearInterval(frameRef.current);
        frameRef.current = null;
      }
    }, 16); // ~60 fps

    return () => {
      if (frameRef.current) {
        clearInterval(frameRef.current);
        frameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <Text style={[{ color: colors.text }, style]}>
      {displayValue}
      {suffix}
    </Text>
  );
}
