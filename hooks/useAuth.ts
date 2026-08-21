import { useAuthStore } from "@/store/useAuthStore";

/**
 * Convenience hook that exposes the most commonly used auth state and actions.
 *
 * Uses individual selectors so each returned value has a stable reference —
 * avoiding infinite re-render loops caused by object-returning selectors.
 *
 * Usage:
 *   const { user, profile, loading, signOut } = useAuth();
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const signOut = useAuthStore((state) => state.signOut);

  return { user, profile, loading, signOut };
}
