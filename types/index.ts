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

// ---------------------------------------------------------------------------
// Teacher / Classroom types
// ---------------------------------------------------------------------------

export type PostType = "announcement" | "material" | "quiz_link";
export type QuizStatus = "draft" | "published";

/** A class (course) created by a teacher. */
export type Class = {
  id: string;
  name: string;
  subject: string;
  section: string | null;
  class_code: string;
  teacher_id: string;
  created_at: string;
};

/** A class row joined with its student count. */
export type ClassWithCount = Class & { student_count: number };

/** Membership linking a student to a class. */
export type ClassMember = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

/** A post in a class feed. */
export type Post = {
  id: string;
  class_id: string;
  author_id: string;
  type: PostType;
  content: string;
  created_at: string;
};

/** A post with its author profile and attachments eagerly loaded. */
export type PostWithDetails = Post & {
  author: Pick<Profile, "full_name" | "avatar_url"> | null;
  attachments: Attachment[];
};

/** A file attachment linked to a post. */
export type Attachment = {
  id: string;
  post_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
};

/** A quiz belonging to a class. */
export type Quiz = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  created_at: string;
  updated_at: string;
};

/** A grade record for a student on a quiz. */
export type Grade = {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  graded_at: string | null;
  created_at: string;
};

/** A grade row with student name and quiz title eagerly loaded. */
export type GradeWithDetails = Grade & {
  student: Pick<Profile, "full_name"> | null;
  quiz: Pick<Quiz, "title"> | null;
};

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

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
  "(teacher)/create-class": undefined;
  "(teacher)/class/[id]": { id: string };
  "(teacher)/class/[id]/quizzes": { id: string };
  "(teacher)/class/[id]/gradebook": { id: string };
  "(student)": undefined;
};
