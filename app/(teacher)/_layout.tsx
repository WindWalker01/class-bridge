import { Redirect, Stack } from "expo-router";

import { Routes } from "@/lib/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function TeacherLayout() {
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);

  // Guard: not authenticated
  if (!session) {
    return <Redirect href={Routes.signIn} />;
  }

  // Guard: not a teacher
  if (profile && profile.role !== "teacher") {
    return <Redirect href={Routes.student} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create-class"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="class/[id]/index" />
      <Stack.Screen name="class/[id]/quizzes" />
      <Stack.Screen name="class/[id]/gradebook" />
      <Stack.Screen name="class/[id]/grade-settings" />
    </Stack>
  );
}
