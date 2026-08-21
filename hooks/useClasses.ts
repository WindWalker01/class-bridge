import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  Class,
  ClassMember,
  ClassWithCount,
  GradeWithDetails,
  PostWithDetails,
  Quiz,
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
// useClassGrades
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

      const { data, error } = await supabase
        .from("grades")
        .select(
          "*, student:profiles!grades_student_id_fkey(full_name), quiz:quizzes!grades_quiz_id_fkey(title)",
        )
        .in("quiz_id", quizIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useClassGrades] fetch error:", error);
        setGrades([]);
      } else {
        setGrades((data ?? []) as unknown as GradeWithDetails[]);
      }

      setLoading(false);
    };

    void fetchGrades();
  }, [classId]);

  return { grades, loading };
}
