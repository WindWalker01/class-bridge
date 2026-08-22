"use client";

import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AccentPalette,
  type ColorTokens,
  getThemeColors,
  lightColors,
  lightRoleAccents,
} from "@/constants/theme";
import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = "system" | "light" | "dark";

export type ThemeContextValue = {
  /** Resolved color tokens for the current effective mode. */
  colors: ColorTokens;
  /** Resolved role accent palette for the current effective mode. */
  accent: AccentPalette;
  /** The effective color scheme ("light" | "dark") after resolving system. */
  resolvedMode: "light" | "dark";
  /** The user's stored preference (defaults to "system"). */
  mode: ThemeMode;
  /** Update the mode preference. */
  setMode: (mode: ThemeMode) => void;
};

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "classbridge_theme_mode";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  children,
  role = null,
}: {
  children: React.ReactNode;
  role?: Role | null;
}) {
  const systemScheme = (useColorScheme() ?? "light") as "light" | "dark";
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Hydrate persisted mode on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (
          stored === "system" ||
          stored === "light" ||
          stored === "dark"
        ) {
          setModeState(stored);
        }
      } catch {
        // SecureStore not available; fall back to system default
      }
    }
    load();
  }, []);

  const resolvedMode = mode === "system" ? systemScheme : mode;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch {
      // Silently fail — persistence is best-effort
    }
  }, []);

  const value = useMemo(() => {
    const { colors, accent } = getThemeColors(resolvedMode, role);
    return { colors, accent, resolvedMode, mode, setMode };
  }, [resolvedMode, role, mode, setMode]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for screens rendered outside the provider (e.g. loading gate)
    // so we don't crash; light mode defaults keep things working.
    return {
      colors: lightColors,
      accent: lightRoleAccents.teacher,
      resolvedMode: "light",
      mode: "system",
      setMode: () => {},
    };
  }
  return ctx;
}