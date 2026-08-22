import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components";
import { ThemeProvider } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/types";

export default function RootLayout() {
  const loading = useAuthStore((state) => state.loading);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const initialize = useAuthStore((state) => state.initialize);
  const setSession = useAuthStore((state) => state.setSession);
  const profile = useAuthStore((state) => state.profile);

  // Initialize auth state on mount
  useEffect(() => {
    if (!hasInitialized) {
      void initialize();
    }
  }, [hasInitialized, initialize]);

  // Safety net: force-hide the native splash screen after 5 s regardless of
  // initialization state so the user never stares at a frozen splash.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // ignore — splash may already be gone
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip the initial session event — initialize() already handles it
        if (event === "INITIAL_SESSION") return;
        // Skip token refresh events — autoRefreshToken handles them internally
        // and calling setSession → fetchProfile would create unnecessary traffic.
        // Profile data doesn't change when the token refreshes.
        if (event === "TOKEN_REFRESHED") return;
        setSession(session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [setSession]);

  // Loading gate: show spinner while reading persisted session
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#208aef" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider role={(profile?.role as Role) ?? null}>
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                animationDuration: 300,
              }}
            />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
