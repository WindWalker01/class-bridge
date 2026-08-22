import { useMemo } from "react";
import { Image, Text, View } from "react-native";

import { typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvatarProps = {
  /** URL for the avatar image. When null/undefined, initials fallback is shown. */
  uri?: string | null;
  /** Full name used to derive initials and fallback colour. */
  name: string;
  /** Diameter in logical pixels. Defaults to 40. */
  size?: number;
};

// ---------------------------------------------------------------------------
// Deterministic color from name
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ca8a04",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/**
 * Circular avatar that renders the user's image when available, or a
 * coloured circle with the first letter of their name as a fallback.
 */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const bgColor = useMemo(() => colorFromName(name), [name]);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const fontSize = size * 0.42;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceMuted,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontSize,
          fontWeight: "600",
          lineHeight: fontSize * 1.2,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}