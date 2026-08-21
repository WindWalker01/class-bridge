import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  Class,
  ClassMember,
  ClassWithCount,
  ClassWithTeacher,
  GradeWithDetails,
  PostWithDetails,
  Quiz,
  QuizAttempt,
  QuizWithStudentStatus,
  StudentGradeItem,
  StudentQuizStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// useTeacherClasses
// ---------------------------------------------------------------------------

export function useTeacherClasses() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("classes")
      .select("*, class_members(count)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useTeacherClasses] fetch error:", error);
      setClasses([]);
    } else {
      const mapped: ClassWithCount[] = (data ?? []).map((row: any) => ({
        ...row,
        student_count: row.class_members?.[0]?.count ?? 0,
      }));
      setClasses(mapped);
    }

    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  }, [fetchClasses]);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, refreshing, refresh };
}

// ---------------------------------------------------------------------------
// useClass
// ---------------------------------------------------------------------------

export function useClass(classId: string) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const fetchClass = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (error) {
        console.error("[useClass] fetch error:", error);
        setClassData(null);
      } else {
        setClassData(data as Class);
      }
      setLoading(false);
    };

    void fetchClass();
  }, [classId]);

  return { classData, loading };
}

// ---------------------------------------------------------------------------
// useClassFeed
// ---------------------------------------------------------------------------

export function useClassFeed(classId: string) {
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, author:profiles!posts_author_id_fkey(full_name, avatar_url), attachments(*)",
      )
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useClassFeed] fetch error:", error);
      setPosts([]);
    } else {
      setPosts((data ?? []) as unknown as PostWithDetails[]);
    }

    setLoading(false);
  }, [classId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refreshing, refresh, setPosts };
}

// ---------------------------------------------------------------------------
// useClassMembers
// ---------------------------------------------------------------------------

export function useClassMembers(classId: string) {
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("class_members")
        .select("*")
        .eq("class_id", classId);

      if (error) {
        console.error("[useClassMembers] fetch error:", error);
        setMembers([]);
      } else {
        setMembers(data as ClassMember[]);
      }
      setLoading(false);
    };

    void fetchMembers();
  }, [classId]);

  return { members, loading };
}

// ---------------------------------------------------------------------------
// useClassQuizzes
// ---------------------------------------------------------------------------

export function useClassQuizzes(classId: string) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useClassQuizzes] fetch error:", error);
      setQuizzes([]);
    } else {
      setQuizzes(data as Quiz[]);
    }

    setLoading(false);
  }, [classId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchQuizzes();
    setRefreshing(false);
  }, [fetchQuizzes]);

  useEffect(() => {
    void fetchQuizzes();
  }, [fetchQuizzes]);

  return { quizzes, loading, refreshing, refresh };
}

// ---------------------------------------------------------------------------
// useClassGrades (updated to use quiz_attempts)
// @deprecated Use useFinalGrades and useGrades from hooks/useGradeEngine.ts
//   for the new Grade Engine (Part 6). This hook reads the legacy flat grades
//   table which is dropped by setup-grades.sql.
// ---------------------------------------------------------------------------

export function useClassGrades(classId: string) {
  const [grades, setGrades] = useState<GradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const fetchGrades = async () => {
      setLoading(true);

      // Get all quizzes for this class
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id")
        .eq("class_id", classId);

      const quizIds = (quizzes ?? []).map((q: any) => q.id);

      if (quizIds.length === 0) {
        setGrades([]);
        setLoading(false);
        return;
      }

      // Fetch graded quiz attempts
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(
          "*, student:profiles!quiz_attempts_student_id_fkey(full_name), quiz:quizzes!quiz_attempts_quiz_id_fkey(title)",
        )
        .in("quiz_id", quizIds)
        .eq("status", "graded")
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("[useClassGrades] fetch error:", error);
        setGrades([]);
      } else {
        // Map quiz_attempts to GradeWithDetails shape
        const mapped: GradeWithDetails[] = (data ?? []).map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          quiz_id: row.quiz_id,
          score: row.score ?? 0,
          max_score: row.max_score ?? 0,
          graded_at: row.submitted_at,
          created_at: row.started_at,
          student: row.student ?? null,
          quiz: row.quiz ?? null,
        }));
        setGrades(mapped);
      }

      setLoading(false);
    };

    void fetchGrades();
  }, [classId]);

  return { grades, loading };
}

// ---------------------------------------------------------------------------
// useStudentClasses
// ---------------------------------------------------------------------------

export function useStudentClasses() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships, error: memberError } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("student_id", user.id);

    if (memberError || !memberships?.length) {
      setClasses([]);
      setLoading(false);
      return;
    }

    const classIds = memberships.map((m) => m.class_id);

    const { data, error } = await supabase
      .from("classes")
      .select("*, teacher:profiles!classes_teacher_id_fkey(full_name)")
      .in("id", classIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useStudentClasses] fetch error:", error);
      setClasses([]);
    } else {
      setClasses((data ?? []) as unknown as ClassWithTeacher[]);
    }

    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  }, [fetchClasses]);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, refreshing, refresh };
}

// ---------------------------------------------------------------------------
// useStudentQuizStatuses (updated to use quiz_attempts)
// ---------------------------------------------------------------------------

function deriveStatus(attempt: QuizAttempt | undefined): StudentQuizStatus {
  if (!attempt) return "not_started";
  if (attempt.status === "graded") return "graded";
  if (attempt.status === "submitted") return "submitted";
  return "in_progress";
}

export function useStudentQuizStatuses(classId: string) {
  const user = useAuthStore((state) => state.user);
  const [quizzes, setQuizzes] = useState<QuizWithStudentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    if (!user || !classId) return;
    setLoading(true);

    // Fetch published quizzes for the class
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("class_id", classId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (quizError) {
      console.error("[useStudentQuizStatuses] quiz error:", quizError);
      setQuizzes([]);
      setLoading(false);
      return;
    }

    const quizList = (quizData ?? []) as Quiz[];

    if (quizList.length === 0) {
      setQuizzes([]);
      setLoading(false);
      return;
    }

    // Fetch the student's quiz attempts for these quizzes
    const quizIds = quizList.map((q) => q.id);
    const { data: attemptData, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("student_id", user.id)
      .in("quiz_id", quizIds);

    if (attemptError) {
      console.error("[useStudentQuizStatuses] attempt error:", attemptError);
    }

    const attemptMap = new Map<string, QuizAttempt>();
    for (const a of attemptData ?? []) {
      attemptMap.set(a.quiz_id, a as QuizAttempt);
    }

    const withStatus: QuizWithStudentStatus[] = quizList.map((quiz) => {
      const attempt = attemptMap.get(quiz.id);
      return {
        ...quiz,
        studentStatus: deriveStatus(attempt),
        score: attempt ? attempt.score : null,
        maxScore: attempt ? attempt.max_score : null,
      };
    });

    setQuizzes(withStatus);
    setLoading(false);
  }, [user, classId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchQuizzes();
    setRefreshing(false);
  }, [fetchQuizzes]);

  useEffect(() => {
    void fetchQuizzes();
  }, [fetchQuizzes]);

  return { quizzes, loading, refreshing, refresh };
}

// ---------------------------------------------------------------------------
// useStudentAllGrades (updated to use quiz_attempts)
// @deprecated Use useStudentFinalGrades from hooks/useGradeEngine.ts for the
//   new Grade Engine (Part 6). This hook reads quiz_attempts directly without
//   weighted category support.
// ---------------------------------------------------------------------------

export function useStudentAllGrades() {
  const user = useAuthStore((state) => state.user);
  const [gradeItems, setGradeItems] = useState<StudentGradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all graded quiz attempts for this student
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(
        "*, quiz:quizzes!quiz_attempts_quiz_id_fkey(title, class_id, class:classes!quizzes_class_id_fkey(name))",
      )
      .eq("student_id", user.id)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("[useStudentAllGrades] fetch error:", error);
      setGradeItems([]);
    } else {
      const items: StudentGradeItem[] = (data ?? []).map((row: any) => ({
        classId: row.quiz?.class_id ?? "",
        className: row.quiz?.class?.name ?? "Unknown Class",
        itemId: row.quiz_id,
        itemName: row.quiz?.title ?? "Unknown Quiz",
        score: row.score ?? 0,
        maxScore: row.max_score ?? 0,
      }));
      setGradeItems(items);
    }

    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGrades();
    setRefreshing(false);
  }, [fetchGrades]);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades]);

  return { gradeItems, loading, refreshing, refresh };
}
