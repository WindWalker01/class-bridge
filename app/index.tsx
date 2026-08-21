import { Redirect } from "expo-router";

import { Routes } from "@/lib/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Entry route. The root layout already gates rendering behind session loading;
 * once loaded, this route declaratively forwards the user to the right group.
 */
export default function Index() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  // Not authenticated → sign in
  if (!session) {
    return <Redirect href={Routes.signIn} />;
  }

  // Authenticated but no profile yet (shouldn't happen with trigger, but guard)
  if (!profile) {
    return <Redirect href={Routes.roleSelection} />;
  }

  // Has profile but not onboarded
  if (!profile.onboarded) {
    if (profile.role) {
      return <Redirect href={Routes.profileSetup} />;
    }
    return <Redirect href={Routes.roleSelection} />;
  }

  // Onboarded — route to correct dashboard
  if (profile.role === "teacher") {
    return <Redirect href={Routes.teacher} />;
  }

  if (profile.role === "student") {
    return <Redirect href={Routes.student} />;
  }

  // Fallback (shouldn't reach here)
  return <Redirect href={Routes.roleSelection} />;
}
