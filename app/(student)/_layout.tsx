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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="join-class" />
      <Stack.Screen name="class/[id]/index" />
      <Stack.Screen name="class/[id]/quizzes" />
      <Stack.Screen name="grades" />
    </Stack>
  );
}
