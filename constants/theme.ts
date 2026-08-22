import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a single role's accent palette. */
export type AccentPalette = {
  accent: string;
  accentMuted: string;
  accentSoft: string;
  accentText: string;
  label: string;
};

/** A complete map of color tokens for one color scheme. */
export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryMuted: string;
  white: string;
  black: string;
  success: string;
  danger: string;
  warning: string;
};

/** Light-mode color tokens (unchanged from the original flat colors object). */
export const lightColors: ColorTokens = {
  background: "#ffffff",
  surface: "#f8fafc",
  surfaceMuted: "#f1f5f9",
  surfaceElevated: "#ffffff",
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
};

/** Dark-mode color tokens. Dark backgrounds use a dark slate family so shadows
 * don't have to do all the heavy lifting; instead a slightly lighter surface
 * tone conveys elevation, with a subtle border that is always visible. */
export const darkColors: ColorTokens = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceMuted: "#334155",
  surfaceElevated: "#1e293b",
  border: "#475569",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  primary: "#60a5fa",
  primaryMuted: "#1e3a5f",
  white: "#ffffff",
  black: "#000000",
  success: "#4ade80",
  danger: "#f87171",
  warning: "#fbbf24",
};

/** Light-mode role accent palettes (unchanged). */
export const lightRoleAccents = {
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

/** Dark-mode role accent palettes. Slightly desaturated and lighter so they
 * don't glare against a dark background while remaining recognizable. */
export const darkRoleAccents = {
  teacher: {
    accent: "#60a5fa",
    accentMuted: "#1e3a5f",
    accentSoft: "#172554",
    accentText: "#93c5fd",
    label: "Teacher",
  },
  student: {
    accent: "#4ade80",
    accentMuted: "#14532d",
    accentSoft: "#052e16",
    accentText: "#86efac",
    label: "Student",
  },
} as const satisfies Record<Role, unknown>;

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

/** Resolves a flat colors object + role accents for the given mode. */
export function getThemeColors(
  mode: "light" | "dark",
  role: Role | null = null,
): { colors: ColorTokens; accent: AccentPalette } {
  const cls = mode === "dark" ? darkColors : lightColors;
  const accents = mode === "dark" ? darkRoleAccents : lightRoleAccents;
  const accent = accents[role ?? "teacher"];
  return { colors: cls, accent };
}

/** Resolves role accents only (for the given mode). */
export function getRoleAccents(
  mode: "light" | "dark",
): { teacher: AccentPalette; student: AccentPalette } {
  return mode === "dark" ? darkRoleAccents : lightRoleAccents;
}

/** Utility: returns one of two values based on the current color mode.
 * Use this in screens that have hardcoded colors that need dark-mode versions.
 */
export function modeColor<T>(mode: "light" | "dark", light: T, dark: T): T {
  return mode === "dark" ? dark : light;
}

// ---------------------------------------------------------------------------
// Static tokens (mode-agnostic)
// ---------------------------------------------------------------------------

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

/** Subtle shadow tokens. In dark mode shadows are barely visible but we keep
 * the same values so the API doesn't change; the surface/border tokens do
 * the visual heavy lifting in dark mode. */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Deprecated aliases (keep existing imports working)
// ---------------------------------------------------------------------------

export const colors = lightColors;
export const roleAccents = lightRoleAccents;
export function getAccent(role: Role | null): AccentPalette {
 return lightRoleAccents[role ?? "teacher"];
}
