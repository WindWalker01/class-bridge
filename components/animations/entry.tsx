/**
 * Reusable entry-animation wrapper components using Reanimated's
 * entering / layout animations.
 *
 * - FadeInView         – generic fade + slight-rise wrapper for cards/items.
 * - FadeInUp           – fade + more-pronounced upward translate.
 * - ScaleInView        – scale + fade entry (e.g. badges, icons).
 * - AnimatedListItem   – FlatList item wrapper with staggered fade-in
 *                        and springy layout shifts.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp as ReaFadeInUp,
  Layout,
  ZoomIn,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// FadeInView
// ---------------------------------------------------------------------------

type FadeInViewProps = {
  children: ReactNode;
  /** Delay before animation starts (ms). Default 0. */
  delay?: number;
  /** Duration of the animation (ms). Default 400. */
  duration?: number;
  /** TranslateY offset when hidden (px). Default 12. */
  offset?: number;
};

/**
 * A generic fade + slight-rise entry wrapper. Ideal for cards appearing in
 * a list (outside FlatList) or any content that should fade in on mount.
 */
export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  offset = 12,
}: FadeInViewProps) {
  const entering = useMemo(
    () =>
      (FadeIn as any).duration(duration).delay(delay).springify().withInitialValues({
        transform: [{ translateY: offset }],
      }),
    [duration, delay, offset],
  );

  return <Animated.View entering={entering}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// FadeInUp
// ---------------------------------------------------------------------------

type FadeInUpProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
};

/**
 * Fade-in with a more pronounced upward translation. Use for items that
 * should feel like they're rising into place (e.g. hero sections).
 */
export function FadeInUp({
  children,
  delay = 0,
  duration = 400,
}: FadeInUpProps) {
  const entering = useMemo(
    () =>
      (ReaFadeInUp as any).duration(duration).delay(delay).springify().withInitialValues({
        transform: [{ translateY: 30 }],
      }),
    [duration, delay],
  );

  return <Animated.View entering={entering}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// ScaleInView
// ---------------------------------------------------------------------------

type ScaleInViewProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
};

/**
 * Scale + fade entry. Good for badges, icons, or elements that should
 * "pop" into view.
 */
export function ScaleInView({
  children,
  delay = 0,
  duration = 300,
}: ScaleInViewProps) {
  const entering = useMemo(
    () => (ZoomIn as any).duration(duration).delay(delay).springify(),
    [duration, delay],
  );

  return <Animated.View entering={entering}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// AnimatedListItem
// ---------------------------------------------------------------------------

type AnimatedListItemProps = {
  children: ReactNode;
  /** Zero-based index used for stagger delay. */
  index: number;
  /** Base delay per item (ms). Default 50. */
  staggerMs?: number;
  /** Duration of each item's fade (ms). Default 300. */
  duration?: number;
};

/**
 * Wraps a FlatList `renderItem` result so items fade-in with a staggered
 * delay based on index, and animate layout changes when siblings are
 * added/removed/reordered.
 *
 * Use this in your renderItem:
 * ```ts
 * renderItem={({ item, index }) => (
 *   <AnimatedListItem index={index}>
 *     <MyCard item={item} />
 *   </AnimatedListItem>
 * )}
 * ```
 *
 * NOTE: Staggered entry only plays on the *initial* mount of each item.
 * Because FlatList recycles views, items scrolled into view later will
 * still animate in — this is desirable (the card fades in as it enters
 * the viewport rather than popping in jarringly).
 */
export function AnimatedListItem({
  children,
  index,
  staggerMs = 50,
  duration = 300,
}: AnimatedListItemProps) {
  const delay = index * staggerMs;

  const entering = useMemo(
    () =>
      (FadeInDown as any).duration(duration).delay(delay).springify().withInitialValues({
        transform: [{ translateY: 16 }],
      }),
    [duration, delay],
  );

  const layout = useMemo(() => (Layout as any).springify(), []);

  return (
    <Animated.View entering={entering} layout={layout}>
      {children}
    </Animated.View>
  );
}
﻿