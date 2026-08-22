/**
 * Collapsible — a Reanimated-powered expand/collapse container that
 * smoothly animates height and opacity when `expanded` changes.
 *
 * Measures its content height via `onLayout` and transitions between
 * 0 and the measured height with `withTiming`.
 *
 * Usage:
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Collapsible expanded={open}>
 *   <ExpensiveForm />
 * </Collapsible>
 * ```
 */
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Collapsible
// ---------------------------------------------------------------------------

export type CollapsibleProps = {
  /** Show (true) or hide (false) the content. */
  expanded: boolean;
  /** Transition duration in ms. Default 250. */
  duration?: number;
  children: ReactNode;
};

export function Collapsible({
  expanded,
  duration = 250,
  children,
}: CollapsibleProps) {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const contentHeight = useSharedValue(0);
  const opacity = useSharedValue(0);
  const hasMeasured = useRef(false);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (!hasMeasured.current) {
        hasMeasured.current = true;
        setMeasuredHeight(h);
        // If already expanded, show immediately
        if (expandedRef.current) {
          contentHeight.value = h;
          opacity.value = 1;
        }
      }
    },
    [contentHeight, opacity],
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (expanded) {
      contentHeight.value = withTiming(measuredHeight, { duration });
      opacity.value = withTiming(1, { duration });
    } else {
      contentHeight.value = withTiming(0, { duration });
      opacity.value = withTiming(0, { duration });
    }

    return {
      height: contentHeight.value,
      opacity: opacity.value,
      overflow: "hidden" as const,
    };
  }, [expanded, measuredHeight, duration]);

  // Before the first measurement, just show/hide children directly
  if (!hasMeasured.current) {
    return expanded ? <View>{children}</View> : null;
  }

  return (
    <Animated.View style={animatedStyle}>
      {/* Invisible measuring layer — always renders to capture content height */}
      <View
        onLayout={onLayout}
        style={{ position: "absolute", width: "100%", opacity: 0 }}
        pointerEvents="none"
      >
        {children}
      </View>
      {/* Visible content */}
      {expanded && <View>{children}</View>}
    </Animated.View>
  );
}
﻿