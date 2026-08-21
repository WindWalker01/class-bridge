import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import type { Profile, Session, User } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
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
  loading: true,
  hasInitialized: false,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      set({
        session,
        user: session?.user ?? null,
        loading: false,
        hasInitialized: true,
      });

      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error("[class-bridge] Failed to initialize auth state", error);
      set({ loading: false, hasInitialized: true });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[class-bridge] Failed to fetch profile", error);
        return;
      }

      set({ profile: data as Profile });
    } catch (error) {
      console.error("[class-bridge] Failed to fetch profile", error);
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
    });

    if (session?.user) {
      void get().fetchProfile(session.user.id);
    } else {
      set({ profile: null });
    }
  },

  reset: () => {
    set({ session: null, user: null, profile: null });
  },
}));
