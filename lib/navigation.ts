/**
 * Typed navigation helpers for expo-router.
 *
 * expo-router auto-generates typed routes from the file system at build time.
 * During development, the type cache can become stale after adding/removing
 * screens. These helpers provide a stable API that works regardless of the
 * current typed-route cache state.
 */
import type { Href } from "expo-router";

export const Routes = {
  // Auth group
  signIn: "/(auth)/sign-in" as Href,
  signUp: "/(auth)/sign-up" as Href,
  forgotPassword: "/(auth)/forgot-password" as Href,
  resetPassword: "/(auth)/reset-password" as Href,
  emailConfirmation: "/(auth)/email-confirmation" as Href,
  roleSelection: "/(auth)/role-selection" as Href,
  profileSetup: "/(auth)/profile-setup" as Href,

  // Dashboard groups
  teacher: "/(teacher)" as Href,
  student: "/(student)" as Href,

  // Teacher screens
  createClass: "/(teacher)/create-class" as Href,
  classFeed: (id: string) => `/(teacher)/class/${id}` as Href,
  classQuizzes: (id: string) => `/(teacher)/class/${id}/quizzes` as Href,
  classGradebook: (id: string) => `/(teacher)/class/${id}/gradebook` as Href,

  // Root
  index: "/" as Href,
} as const;
