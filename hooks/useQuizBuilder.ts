import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { GradeCategory, MCQOption, Question, QuestionType, Quiz } from "@/types";

// ---------------------------------------------------------------------------
// useQuizBuilder
// ---------------------------------------------------------------------------

export function useQuizBuilder(quizId: string) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError) {
      console.error("[useQuizBuilder] quiz fetch error:", quizError);
      setQuiz(null);
    } else {
      setQuiz(quizData as Quiz);
    }

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });

    if (questionError) {
      console.error("[useQuizBuilder] questions fetch error:", questionError);
      setQuestions([]);
    } else {
      setQuestions((questionData ?? []) as Question[]);
    }

    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    void fetchQuiz();
  }, [fetchQuiz]);

  // ---------------------------------------------------------------------------
  // Quiz-level operations
  // ---------------------------------------------------------------------------

  const updateQuiz = async (updates: Partial<Quiz>) => {
    if (!quizId) return;
    setSaving(true);

    // Keep track of what's changing for post-update sync
    const isCategoryChange = "category_id" in updates;
    const isTitleChange = "title" in updates;

    const { error } = await supabase
      .from("quizzes")
      .update(updates)
      .eq("id", quizId);
    if (error) {
      console.error("[useQuizBuilder] update quiz error:", error);
    } else {
      setQuiz((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    // If quiz is published and category/title changed, sync the graded_item
    const currentStatus = quiz?.status;
    if (!error && currentStatus === "published") {
      const giUpdates: Record<string, any> = {};
      if (isCategoryChange) {
        giUpdates.category_id = updates.category_id;
      }
      if (isTitleChange) {
        giUpdates.title = updates.title;
      }
      if (Object.keys(giUpdates).length > 0) {
        const { error: giError } = await supabase
          .from("graded_items")
          .update(giUpdates)
          .eq("source_type", "quiz")
          .eq("source_id", quizId);
        if (giError) {
          console.error(
            "[useQuizBuilder] graded_item sync error:",
            giError,
          );
        }
      }
    }

    setSaving(false);
  };

  const togglePublish = async (overrideCategoryId?: string | null) => {
    if (!quiz) return;
    const isPublishing = quiz.status !== "published";
    setSaving(true);

    // Use the override if provided, otherwise fall back to current quiz state
    const effectiveCategoryId =
      overrideCategoryId !== undefined ? overrideCategoryId : quiz.category_id;

    if (isPublishing) {
      // --- Publishing: upsert graded_item --------------------------------
      const totalPoints =
        questions.length > 0
          ? questions.reduce((sum, q) => sum + (q.points ?? 1), 0)
          : 100;

      // 1. Set status to published + ensure category_id is saved
      const { error: pubError } = await supabase
        .from("quizzes")
        .update({ status: "published", category_id: effectiveCategoryId })
        .eq("id", quizId);

      if (pubError) {
        console.error("[useQuizBuilder] publish error:", pubError);
        setSaving(false);
        return;
      }

      // 2. Upsert graded_item for this quiz
      const { error: giError } = await supabase
        .from("graded_items")
        .upsert(
          {
            class_id: quiz.class_id,
            category_id: effectiveCategoryId,
            source_type: "quiz",
            source_id: quizId,
            title: quiz.title,
            max_score: totalPoints,
          },
          {
            onConflict: "source_type, source_id",
            ignoreDuplicates: false,
          },
        )
        .select()
        .maybeSingle();

      if (giError) {
        console.error(
          "[useQuizBuilder] graded_item upsert error:",
          giError,
        );
      }

      setQuiz((prev) =>
        prev ? { ...prev, status: "published", category_id: effectiveCategoryId } : prev,
      );
    } else {
      // --- Unpublishing: remove graded_item + grades ---------------------
      // 1. Get the graded_item id
      const { data: gi } = await supabase
        .from("graded_items")
        .select("id")
        .eq("source_type", "quiz")
        .eq("source_id", quizId)
        .maybeSingle();

      if (gi) {
        // Delete grades first (FK), then graded_item
        await supabase.from("grades").delete().eq("graded_item_id", gi.id);
        await supabase
          .from("graded_items")
          .delete()
          .eq("id", gi.id);
      }

      // 2. Set status back to draft
      const { error: draftError } = await supabase
        .from("quizzes")
        .update({ status: "draft" })
        .eq("id", quizId);

      if (draftError) {
        console.error(
          "[useQuizBuilder] unpublish error:",
          draftError,
        );
      }

      setQuiz((prev) =>
        prev ? { ...prev, status: "draft" } : prev,
      );
    }

    setSaving(false);
  };

  // ---------------------------------------------------------------------------
  // Question CRUD
  // ---------------------------------------------------------------------------

  const addQuestion = async (data: {
    type: QuestionType;
    prompt: string;
    options?: MCQOption[];
    correct_answer: string | boolean | { key: string };
    points?: number;
    time_limit_seconds?: number | null;
  }) => {
    if (!quizId) return;
    setSaving(true);

    const nextIndex = questions.length;

    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        quiz_id: quizId,
        order_index: nextIndex,
        type: data.type,
        prompt: data.prompt,
        options: data.options ?? null,
        correct_answer: data.correct_answer,
        points: data.points ?? 1,
        time_limit_seconds: data.time_limit_seconds ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[useQuizBuilder] add question error:", error);
    } else if (inserted) {
      setQuestions((prev) => [...prev, inserted as Question]);
    }

    setSaving(false);
  };

  const updateQuestion = async (
    questionId: string,
    updates: Partial<{
      type: QuestionType;
      prompt: string;
      options: MCQOption[] | null;
      correct_answer: string | boolean | { key: string };
      points: number;
      time_limit_seconds: number | null;
    }>,
  ) => {
    setSaving(true);
    const { error } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", questionId);

    if (error) {
      console.error("[useQuizBuilder] update question error:", error);
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
      );
    }
    setSaving(false);
  };

  const deleteQuestion = async (questionId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      console.error("[useQuizBuilder] delete question error:", error);
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    }
    setSaving(false);
  };

  const reorderQuestions = async (orderedIds: string[]) => {
    setSaving(true);

    // Update each question's order_index individually via UPDATE.
    // We cannot use upsert here because the upsert payload lacks quiz_id,
    // which causes the INSERT-branch of the RLS `with check` to fail (42501).
    // UPDATE uses the `using` clause (existing row has quiz_id), so RLS passes.
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("questions")
          .update({ order_index: index })
          .eq("id", id),
      ),
    );

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("[useQuizBuilder] reorder error:", errors[0].error);
    } else {
      setQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q]));
        return orderedIds
          .map((id, index) => {
            const q = map.get(id);
            return q ? { ...q, order_index: index } : null;
          })
          .filter(Boolean) as Question[];
      });
    }
    setSaving(false);
  };

  return {
    quiz,
    questions,
    loading,
    saving,
    fetchQuiz,
    updateQuiz,
    togglePublish,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}
