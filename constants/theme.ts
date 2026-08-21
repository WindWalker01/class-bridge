import type { Role } from "@/types";

/**
 * Base theme tokens for Class Bridge.
 *
 * Colors are plain hex values so they can be used both in React Native styles
 * and by NativeWind (see the mirrored tailwind.config.js color scales).
 */
export const colors = {
  // Brand / neutral
  background: "#ffffff",
  surface: "#f8fafc",
  surfaceMuted: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  primary: "#208aef",
  primaryMuted: "#dbeafe",
  white: "#ffffff",
  black: "#000000",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
} as const;

/** Shape of a single role's accent palette. */
export type AccentPalette = {
  accent: string;
  accentMuted: string;
  accentSoft: string;
  accentText: string;
  label: string;
};

/**
 * Role-specific accent palettes. Teacher uses a blue accent and Student uses
 * a green accent so the two contexts are visually distinct.
 */
export const roleAccents = {
  teacher: {
    accent: "#2563eb",
    accentMuted: "#dbeafe",
    accentSoft: "#eff6ff",
    accentText: "#1d4ed8",
    label: "Teacher",
  },
  student: {
    accent: "#16a34a",
    accentMuted: "#dcfce7",
    accentSoft: "#f0fdf4",
    accentText: "#15803d",
    label: "Student",
  },
} as const satisfies Record<Role, unknown>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** Returns the accent palette for a given role (defaults to teacher). */
export function getAccent(role: Role | null): AccentPalette {
  return roleAccents[role ?? "teacher"];
}
