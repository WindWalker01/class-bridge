import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { MCQOption, Question, QuestionType, Quiz } from "@/types";

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
    const { error } = await supabase
      .from("quizzes")
      .update(updates)
      .eq("id", quizId);
    if (error) {
      console.error("[useQuizBuilder] update quiz error:", error);
    } else {
      setQuiz((prev) => (prev ? { ...prev, ...updates } : prev));
    }
    setSaving(false);
  };

  const togglePublish = async () => {
    if (!quiz) return;
    const newStatus = quiz.status === "published" ? "draft" : "published";
    await updateQuiz({ status: newStatus });
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
    // Update each question's order_index
    const updates = orderedIds.map((id, index) => ({
      id,
      order_index: index,
    }));

    const { error } = await supabase.from("questions").upsert(
      updates.map((u) => ({
        id: u.id,
        order_index: u.order_index,
      })),
    );

    if (error) {
      console.error("[useQuizBuilder] reorder error:", error);
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
