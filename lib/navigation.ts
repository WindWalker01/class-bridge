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
  verifyOtp: "/(auth)/verify-otp" as Href,
  resetPassword: "/(auth)/reset-password" as Href,
  roleSelection: "/(auth)/role-selection" as Href,
  profileSetup: "/(auth)/profile-setup" as Href,

  // Dashboard groups
  teacher: "/(teacher)" as Href,
  student: "/(student)" as Href,

  // Teacher screens
  createClass: "/(teacher)/create-class" as Href,
  teacherArchivedClasses: "/(teacher)/archived-classes" as Href,
  classFeed: (id: string) => `/(teacher)/class/${id}` as Href,
  classQuizzes: (id: string) => `/(teacher)/class/${id}/quizzes` as Href,
  classGradebook: (id: string) => `/(teacher)/class/${id}/gradebook` as Href,

  // Teacher tab screens
  teacherTab: "/(teacher)/(tabs)" as Href,
  teacherTabQuizzes: "/(teacher)/(tabs)/quizzes" as Href,
  teacherTabGradebook: "/(teacher)/(tabs)/gradebook" as Href,

  // Settings screens
  teacherSettings: "/(teacher)/settings" as Href,
  studentSettings: "/(student)/settings" as Href,

  // Student screens
  studentJoinClass: "/(student)/join-class" as Href,
  studentClassFeed: (id: string) => `/(student)/class/${id}` as Href,
  studentClassQuizzes: (id: string) => `/(student)/class/${id}/quizzes` as Href,

  // Student tab screens
  studentTab: "/(student)/(tabs)" as Href,
  studentTabQuizzes: "/(student)/(tabs)/quizzes" as Href,
  studentTabGrades: "/(student)/(tabs)/grades" as Href,

  // Root
  index: "/" as Href,
} as const;
