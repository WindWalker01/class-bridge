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
export type QuizStatus = "draft" | "published" | "closed";
export type QuizMode = "standard" | "timed" | "gamified";
export type QuestionType = "mcq" | "true_false" | "short_answer";

/** A configurable speed bonus tier for gamified quizzes.
 *  When a student answers within `maxTimeSeconds`, their points are
 *  multiplied by `multiplier`. Tiers are checked in order — the
 *  first matching tier (lowest maxTimeSeconds) that applies wins. */
export type SpeedBonusTier = {
  maxTimeSeconds: number;
  multiplier: number;
};

/** Sensible defaults matching the original hardcoded thresholds. */
export const DEFAULT_SPEED_BONUS_TIERS: SpeedBonusTier[] = [
  { maxTimeSeconds: 5, multiplier: 2.0 },
  { maxTimeSeconds: 15, multiplier: 1.5 },
  { maxTimeSeconds: 30, multiplier: 1.25 },
];

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
  mode: QuizMode;
  time_limit_seconds: number | null;
  due_at: string | null;
  status: QuizStatus;
  speed_bonus_tiers: SpeedBonusTier[] | null;
  created_at: string;
  updated_at: string;
};

/** A question within a quiz. */
export type Question = {
  id: string;
  quiz_id: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  options: MCQOption[] | null;
  correct_answer: string | boolean | { key: string };
  points: number;
  time_limit_seconds: number | null;
};

/** An option for an MCQ question. */
export type MCQOption = {
  key: string;
  text: string;
};

/** A student's attempt at a quiz. */
export type QuizAttempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
  status: "in_progress" | "submitted" | "graded";
  mode: QuizMode;
};

/** An answer submitted by a student for a question. */
export type Answer = {
  id: string;
  attempt_id: string;
  question_id: string;
  response: string | boolean | { selectedKey: string } | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  needs_review: boolean;
  time_taken_ms: number | null;
  answered_at: string;
};

/** A grade record for a student on a quiz (legacy, superseded by QuizAttempt). */
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
// Grade Engine types (Part 6)
// ---------------------------------------------------------------------------

/** A weighted grade category for a class (e.g. "Quizzes" 40%, "Participation" 20%). */
export type GradeCategory = {
  id: string;
  class_id: string;
  name: string;
  weight: number;
  created_at: string;
};

/** A graded item — either a quiz (auto-created) or a manual entry. */
export type GradedItem = {
  id: string;
  class_id: string;
  category_id: string;
  source_type: "quiz" | "manual";
  source_id: string | null;
  title: string;
  max_score: number;
  created_at: string;
};

/** A single grade entry for a student on a graded item. */
export type GradeEntry = {
  id: string;
  graded_item_id: string;
  student_id: string;
  score: number;
  graded_at: string;
};

/** Per-category breakdown returned by final_grades(). */
export type CategoryBreakdown = {
  categoryName: string;
  weight: number;
  percentage: number;
  score: number;
  maxScore: number;
};

/** A student's final grade result from the final_grades() RPC. */
export type FinalGrade = {
  studentId: string;
  studentName: string;
  categoryBreakdown: CategoryBreakdown[];
  finalPercentage: number;
  letterGrade: string;
};

// ---------------------------------------------------------------------------
// Student-side types
// ---------------------------------------------------------------------------

/** A class row joined with its teacher's profile. */
export type ClassWithTeacher = Class & {
  teacher: Pick<Profile, "full_name"> | null;
};

/** The status of a quiz from a student's perspective. */
export type StudentQuizStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded";

/** A quiz with the current student's status and score. */
export type QuizWithStudentStatus = Quiz & {
  studentStatus: StudentQuizStatus;
  score: number | null;
  maxScore: number | null;
};

/** A grade item for the student's grades screen. */
export type StudentGradeItem = {
  classId: string;
  className: string;
  itemId: string;
  itemName: string;
  score: number;
  maxScore: number;
};

/** A leaderboard entry for a quiz. */
export type LeaderboardEntry = {
  student_id: string;
  student_name: string;
  score: number;
  max_score: number;
  submitted_at: string;
  rank: number;
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
  "(auth)/verify-otp": undefined;
  "(auth)/reset-password": undefined;
  "(auth)/email-confirmation": undefined;
  "(auth)/role-selection": undefined;
  "(auth)/profile-setup": undefined;
  "(teacher)": undefined;
  "(teacher)/create-class": undefined;
  "(teacher)/settings": undefined;
  "(teacher)/class/[id]": { id: string };
  "(teacher)/class/[id]/quizzes": { id: string };
  "(teacher)/class/[id]/quizzes/create": { id: string };
  "(teacher)/class/[id]/quizzes/[quizId]/edit": {
    id: string;
    quizId: string;
  };
  "(teacher)/class/[id]/gradebook": { id: string };
  "(student)": undefined;
  "(student)/settings": undefined;
  "(student)/class/[id]/quizzes/[quizId]/take": {
    id: string;
    quizId: string;
  };
  "(student)/class/[id]/quizzes/[quizId]/leaderboard": {
    id: string;
    quizId: string;
  };
};
