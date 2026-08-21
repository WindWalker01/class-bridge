import { useAuthStore } from "@/store/useAuthStore";

/**
 * Convenience hook that exposes the most commonly used auth state and actions.
 *
 * Usage:
 *   const { user, profile, loading, signOut } = useAuth();
 */
export function useAuth() {
  return useAuthStore((state) => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    signOut: state.signOut,
  }));
}
