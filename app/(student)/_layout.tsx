import { Redirect, Stack } from "expo-router";

import { Routes } from "@/lib/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function StudentLayout() {
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);

  // Guard: not authenticated
  if (!session) {
    return <Redirect href={Routes.signIn} />;
  }

  // Guard: not a student
  if (profile && profile.role !== "student") {
    return <Redirect href={Routes.teacher} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen
        name="join-class"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="class/[id]/index" />
      <Stack.Screen name="class/[id]/quizzes" />
    </Stack>
  );
}
