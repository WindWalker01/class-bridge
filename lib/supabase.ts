import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { supabaseConfig } from "@/constants/config";

const STORAGE_KEY = "classbridge.supabase.auth.token";

/**
 * A Supabase-compatible storage adapter backed by `expo-secure-store`.
 *
 * Supabase persists its session JSON through `auth.storage`, so wiring it to
 * SecureStore keeps the user signed in across app restarts while storing the
 * session in the platform's encrypted keychain/keystore.
 */
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

const url = supabaseConfig.url;
const anonKey = supabaseConfig.anonKey;

let missingEnvWarned = false;

function warnMissingEnv(): void {
  if (missingEnvWarned) return;
  missingEnvWarned = true;
  console.warn(
    "[class-bridge] Supabase is not configured yet. " +
      "Copy `.env.example` to `.env.local` and set " +
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

/**
 * The singleton Supabase client.
 *
 * If environment variables are missing the client is created with empty
 * strings so imports don't crash at startup; the console warning above makes
 * the missing configuration obvious during development.
 */
export const supabase: SupabaseClient = createClient(url ?? "", anonKey ?? "", {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (!url || !anonKey) {
  warnMissingEnv();
}

/** The key used to persist the Supabase auth session in SecureStore. */
export { STORAGE_KEY };
