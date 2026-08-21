export const appConfig = {
  name: "Class Bridge",
  scheme: "classbridge",
} as const;

export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;
