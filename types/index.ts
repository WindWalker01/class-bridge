import type { Session, User } from "@supabase/supabase-js";

/** The two application roles. */
export type Role = "teacher" | "student";

/** A user's profile row from the `profiles` table. */
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role | null;
  onboarded: boolean;
  created_at: string;
};

/** Minimal authenticated user shape used by the app store. */
export type AppUser = {
  id: string;
  email?: string | null;
  role: Role | null;
};

/** Re-exported for convenience so screens don't need to import Supabase directly. */
export type { Session, User };

/**
 * Root navigation param list for expo-router.
 *
 * Typed routes are enabled in `app.json`; this is a lightweight manual map
 * for the placeholder flows and will grow as real screens are added.
 */
export type RootStackParamList = {
  index: undefined;
  "(auth)/sign-in": undefined;
  "(auth)/sign-up": undefined;
  "(auth)/forgot-password": undefined;
  "(auth)/reset-password": undefined;
  "(auth)/email-confirmation": undefined;
  "(auth)/role-selection": undefined;
  "(auth)/profile-setup": undefined;
  "(teacher)": undefined;
  "(student)": undefined;
};
