/**
 * ParticleBurst — a lightweight confetti burst using Reanimated shared values.
 * Launches a configurable number of particles (small circles/squares) from the
 * center outward with randomized velocity, gravity, and rotation.
 *
 * Designed to be tasteful and quick (~800ms), not gimmicky.
 */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { colors } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParticleConfig = {
  /** Number of particles. Default 20. */
  count?: number;
  /** Duration in ms. Default 800. */
  duration?: number;
  /** Colors to randomly pick from. */
  colors?: string[];
  /** Particle size (width/height) in px. Default 8. */
  size?: number;
  /** Whether particles are rounded (circles). Default true. */
  rounded?: boolean;
};

export type ParticleBurstProps = {
  /** Trigger the burst when true. */
  active: boolean;
  /** Optional config overrides. */
  config?: ParticleConfig;
  /** Optional callback when burst animation completes. */
  onComplete?: () => void;
  /** Optional children placed behind the burst layer. */
  children?: ReactNode;
};
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  colors.success,
  "#22c55e",
  "#16a34a",
  "#4ade80",
  "#86efac",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#fbbf24",
  "#f59e0b",
];

const DEFAULT_COUNT = 20;
const DEFAULT_DURATION = 800;
const DEFAULT_SIZE = 8;

// ---------------------------------------------------------------------------
// Single Particle
// ---------------------------------------------------------------------------

type ParticleState = {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  size: number;
  rounded: boolean;
};

function createParticle(
  id: number,
  colorsArr: string[],
  size: number,
  rounded: boolean,
): ParticleState {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 60 + Math.random() * 100;
  return {
    id,
    x: Math.cos(angle) * velocity,
    y: Math.sin(angle) * velocity - 20,
    rotation: Math.random() * 720 - 360,
    scale: 0.5 + Math.random() * 0.8,
    color: colorsArr[Math.floor(Math.random() * colorsArr.length)],
    size: size * (0.5 + Math.random() * 0.8),
    rounded,
  };
}
// ---------------------------------------------------------------------------
// ParticleItem
// ---------------------------------------------------------------------------

function ParticleItem({ particle, duration }: { particle: ParticleState; duration: number }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateX.value = withTiming(particle.x, {
      duration,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(particle.y, {
      duration,
      easing: Easing.in(Easing.quad),
    });
    rotate.value = withTiming(particle.rotation, { duration });
    scale.value = withTiming(particle.scale, { duration });
    opacity.value = withDelay(
      duration * 0.3,
      withTiming(0, { duration: duration * 0.7 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: particle.size,
          height: particle.size,
          borderRadius: particle.rounded ? particle.size / 2 : 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// ParticleBurst
// ---------------------------------------------------------------------------

export function ParticleBurst({
  active,
  config,
  onComplete,
  children,
}: ParticleBurstProps) {
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const [burstId, setBurstId] = useState(0);

  const count = config?.count ?? DEFAULT_COUNT;
  const duration = config?.duration ?? DEFAULT_DURATION;
  const particleColors = config?.colors ?? DEFAULT_COLORS;
  const particleSize = config?.size ?? DEFAULT_SIZE;
  const rounded = config?.rounded ?? true;

  useEffect(() => {
    if (active) {
      const id = burstId + 1;
      setBurstId(id);
      const newParticles: ParticleState[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push(createParticle(i, particleColors, particleSize, rounded));
      }
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration + 100);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active]);

  if (!active && particles.length === 0) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      <View style={styles.burstLayer} pointerEvents="none">
        {particles.map((p) => (
          <ParticleItem key={`${burstId}-${p.id}`} particle={p} duration={duration} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  burstLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});