/* eslint-disable react-hooks/immutability */
/**
 * Reusable press-scale + opacity animation hook for buttons and pressable
 * surfaces. Provides animated styles and event handlers that produce a
 * subtle scale-down + opacity shift on press-in, springing back on press-out.
 *
 * Usage:
 * ```ts
 * const { animatedStyle, pressIn, pressOut } = usePressAnimation();
 *
 * <Pressable onPressIn={pressIn} onPressOut={pressOut}>
 *   <Animated.View style={[baseStyle, animatedStyle]}>
 *     {children}
 *   </Animated.View>
 * </Pressable>
 * ```
 */
import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from "react-native-reanimated";

import { haptics } from "@/lib/haptics";

// ---------------------------------------------------------------------------
// Default spring config — subtle, not bouncy
// ---------------------------------------------------------------------------

const SPRING_CONFIG: WithSpringConfig = {
  stiffness: 300,
  damping: 20,
  mass: 0.5,
};

const SCALE_IN = 0.97;
const OPACITY_IN = 0.85;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePressAnimation(options?: {
  /** Whether to fire a light haptic on press-in. Defaults to false. */
  hapticOnPress?: boolean;
  scale?: number;
  opacity?: number;
}) {
  const pressed = useSharedValue(0);
  const {
    hapticOnPress = false,
    scale = SCALE_IN,
    opacity = OPACITY_IN,
  } = options ?? {};

  const animatedStyle = useAnimatedStyle(() => {
    if (pressed.value === 1) {
      return {
        transform: [{ scale }],
        opacity,
      };
    }
    return {
      transform: [{ scale: 1 }],
      opacity: 1,
    };
  });

  const pressIn = useCallback(() => {
    if (hapticOnPress) {
      haptics.light();
    }
    pressed.value = withSpring(1 as any, SPRING_CONFIG as any) as any;
  }, [hapticOnPress, pressed]);

  const pressOut = useCallback(() => {
    pressed.value = withSpring(0 as any, SPRING_CONFIG as any) as any;
  }, [pressed]);

  return { animatedStyle, pressIn, pressOut };
}
