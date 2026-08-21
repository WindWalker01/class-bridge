import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function RootLayout() {
  const loading = useAuthStore((state) => state.loading);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const initialize = useAuthStore((state) => state.initialize);
  const setSession = useAuthStore((state) => state.setSession);

  // Initialize auth state on mount
  useEffect(() => {
    if (!hasInitialized) {
      void initialize();
    }
  }, [hasInitialized, initialize]);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip the initial session event — initialize() already handles it
        if (event === "INITIAL_SESSION") return;
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
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
