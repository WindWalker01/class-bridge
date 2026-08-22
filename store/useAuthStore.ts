import { create } from "zustand";

import { supabase, retryWithBackoff } from "@/lib/supabase";
import type { Profile, Session, User } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True while a profile fetch is in flight (e.g. right after sign-in). */
  profileLoading: boolean;
  /** Guards against concurrent fetchProfile calls. */
  isFetchingProfile: boolean;
  loading: boolean;
  hasInitialized: boolean;

  /** Reads the persisted Supabase session + profile on app launch. */
  initialize: () => Promise<void>;

  /** Fetches the profile row from the `profiles` table for the current user. */
  fetchProfile: (userId: string) => Promise<void>;

  /** Upserts profile fields (full_name, avatar_url, role, onboarded). */
  updateProfile: (
    data: Partial<
      Pick<Profile, "full_name" | "avatar_url" | "role" | "onboarded">
    >,
  ) => Promise<void>;

  /** Signs out, clears state. Navigation is handled by the root layout guard. */
  signOut: () => Promise<void>;

  /** Called by onAuthStateChange to update session/user in the store. */
  setSession: (session: Session | null) => void;

  /** Clears in-memory auth state (used internally). */
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  profileLoading: false,
  loading: true,
  hasInitialized: false,
  isFetchingProfile: false,

  initialize: async () => {
    try {
      const { data } = await retryWithBackoff(() => supabase.auth.getSession(), 3, 600);
      const session = data.session;

      set({
        session,
        user: session?.user ?? null,
      });

      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error("[class-bridge] Failed to initialize auth state", error);
    } finally {
      set({ loading: false, hasInitialized: true });
    }
  },

  fetchProfile: async (userId: string) => {
    // Guard: prevent concurrent profile fetches
    if (get().isFetchingProfile) return;
    set({ profileLoading: true, isFetchingProfile: true });
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Rate-limit errors shouldn't clear the session — the session is
        // still valid, only the profile fetch failed temporarily.
        if (error.code === "429" || error.message?.includes("rate limit")) {
          console.warn(
            "[class-bridge] Profile fetch rate-limited — keeping current profile",
          );
          set({ profileLoading: false, isFetchingProfile: false });
          return;
        }

        console.error("[class-bridge] Failed to fetch profile", error);
        set({ profile: null, profileLoading: false, isFetchingProfile: false });
        return;
      }

      set({ profile: data as Profile, profileLoading: false, isFetchingProfile: false });
    } catch (error) {
      console.error("[class-bridge] Failed to fetch profile", error);
      set({ profile: null, profileLoading: false, isFetchingProfile: false });
    }
  },

  updateProfile: async (data) => {
    const user = get().user;
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...data }, { onConflict: "id" });

      if (error) {
        console.error("[class-bridge] Failed to update profile", error);
        return;
      }

      await get().fetchProfile(user.id);
    } catch (error) {
      console.error("[class-bridge] Failed to update profile", error);
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[class-bridge] Failed to sign out", error);
    }

    get().reset();
  },

  setSession: (session: Session | null) => {
    set({
      session,
      user: session?.user ?? null,
      profileLoading: !!session?.user,
    });

    if (session?.user) {
      void get().fetchProfile(session.user.id);
    } else {
      set({ profile: null, isFetchingProfile: false });
    }
  },

  reset: () => {
    set({ session: null, user: null, profile: null, profileLoading: false, isFetchingProfile: false });
  },
}));
