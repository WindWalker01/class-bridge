import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { supabaseConfig } from "@/constants/config";

const STORAGE_KEY = "classbridge.supabase.auth.token";

/**
 * Simple retry-with-exponential-backoff for async operations that can fail
 * transiently (e.g. network blips, rate limits).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries - 1) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(
        `[class-bridge] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

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

/** Retry utility for transient failures (rate limits, network blips). */
export { retryWithBackoff };
