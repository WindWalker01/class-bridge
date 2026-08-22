import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Answer, Question, Quiz, QuizAttempt } from "@/types";

// ---------------------------------------------------------------------------
// useQuizTaking
// ---------------------------------------------------------------------------

export function useQuizTaking(quizId: string) {
  const user = useAuthStore((state) => state.user);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now(),
  );
  const [overallTimeLeft, setOverallTimeLeft] = useState<number | null>(null);
  const overallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gamified state
  const [streak, setStreak] = useState(0);
  const [runningScore, setRunningScore] = useState(0);

  // ---------------------------------------------------------------------------
  // Fetch quiz, questions, and existing attempt
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!quizId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Fetch quiz
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError || !quizData) {
      setError("Quiz not found");
      setLoading(false);
      return;
    }

    const fetchedQuiz = quizData as Quiz;
    setQuiz(fetchedQuiz);

    // Fetch questions
    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });

    if (questionError) {
      setError("Failed to load questions");
      setLoading(false);
      return;
    }

    setQuestions((questionData ?? []) as Question[]);
    const fetchedQuestions = (questionData ?? []) as Question[];

    // Check for existing attempt
    const { data: attemptData, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (attemptError) {
      console.error("[useQuizTaking] attempt fetch error:", attemptError);
    }

    if (attemptData) {
      const existingAttempt = attemptData as QuizAttempt;
      setAttempt(existingAttempt);

      // Fetch existing answers
      const { data: answerData } = await supabase
        .from("answers")
        .select("*")
        .eq("attempt_id", existingAttempt.id);

      setAnswers((answerData ?? []) as Answer[]);

      // If already submitted/graded, don't allow changes
      if (existingAttempt.status !== "in_progress") {
        setCurrentIndex(fetchedQuestions.length); // show review
      }
    }

    setLoading(false);
  }, [quizId, user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Overall quiz timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (quiz?.time_limit_seconds && attempt?.status === "in_progress") {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt.started_at).getTime()) / 1000,
      );
      const remaining = Math.max(0, quiz.time_limit_seconds - elapsed);
      setOverallTimeLeft(remaining);

      overallTimerRef.current = setInterval(() => {
        setOverallTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            if (overallTimerRef.current) clearInterval(overallTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, [quiz?.time_limit_seconds, attempt?.status, attempt?.started_at]);

  // Auto-submit when overall time expires
  useEffect(() => {
    if (overallTimeLeft === 0 && attempt?.status === "in_progress") {
      void submitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallTimeLeft]);

  // ---------------------------------------------------------------------------
  // Start attempt
  // ---------------------------------------------------------------------------

  const startAttempt = async () => {
    if (!quizId || !user || !quiz) return;
    setLoading(true);

    const { data, error: insertError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        status: "in_progress",
        mode: quiz.mode,
      })
      .select()
      .single();

    if (insertError) {
      setError("Failed to start quiz");
      setLoading(false);
      return;
    }

    setAttempt(data as QuizAttempt);
    setCurrentIndex(0);
    setQuestionStartTime(Date.now());
    setLoading(false);
  };

  // ---------------------------------------------------------------------------
  // Answer a question
  // ---------------------------------------------------------------------------

  const saveAnswer = async (
    questionId: string,
    response: string | boolean | { selectedKey: string },
  ) => {
    if (!attempt || attempt.status !== "in_progress") return;

    const timeTakenMs = Date.now() - questionStartTime;

    // Check if answer already exists
    const existingAnswer = answers.find((a) => a.question_id === questionId);

    if (existingAnswer) {
      // Update
      const { error: updateError } = await supabase
        .from("answers")
        .update({
          response,
          time_taken_ms: timeTakenMs,
          answered_at: new Date().toISOString(),
        })
        .eq("id", existingAnswer.id);

      if (!updateError) {
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === existingAnswer.id
              ? { ...a, response, time_taken_ms: timeTakenMs }
              : a,
          ),
        );
      }
    } else {
      // Insert
      const { data, error: insertError } = await supabase
        .from("answers")
        .insert({
          attempt_id: attempt.id,
          question_id: questionId,
          response,
          time_taken_ms: timeTakenMs,
        })
        .select()
        .single();

      if (!insertError && data) {
        setAnswers((prev) => [...prev, data as Answer]);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setQuestionStartTime(Date.now());
    }
  };

  // ---------------------------------------------------------------------------
  // Get current answer for a question
  // ---------------------------------------------------------------------------

  const getAnswer = (questionId: string): Answer | undefined => {
    return answers.find((a) => a.question_id === questionId);
  };

  // ---------------------------------------------------------------------------
  // Submit quiz
  // ---------------------------------------------------------------------------

  const submitQuiz = async () => {
    if (!attempt || attempt.status !== "in_progress") return;
    setSubmitting(true);

    // Call the auto-grading RPC (it handles setting status to 'graded' and submitted_at)
    const { data: gradedAttempt, error: gradeError } = await supabase.rpc(
      "grade_attempt",
      { p_attempt_id: attempt.id },
    );

    if (gradeError) {
      console.error("[useQuizTaking] grade error:", gradeError);
      setError("Failed to grade quiz");
    } else if (gradedAttempt) {
      setAttempt(gradedAttempt as unknown as QuizAttempt);
    }

    setSubmitting(false);
  };

  // ---------------------------------------------------------------------------
  // Gamified helpers
  // ---------------------------------------------------------------------------

  const updateGamifiedScore = (isCorrect: boolean, pointsAwarded: number) => {
    if (isCorrect) {
      setStreak((prev) => prev + 1);
      setRunningScore((prev) => prev + pointsAwarded);
    } else {
      setStreak(0);
    }
  };

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const answeredCount = answers.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFirstQuestion = currentIndex === 0;
  const isSubmitted =
    attempt?.status === "submitted" || attempt?.status === "graded";
  const isGraded = attempt?.status === "graded";

  return {
    quiz,
    questions,
    attempt,
    answers,
    currentIndex,
    currentQuestion,
    totalQuestions,
    answeredCount,
    isLastQuestion,
    isFirstQuestion,
    isSubmitted,
    isGraded,
    loading,
    submitting,
    error,
    overallTimeLeft,
    streak,
    runningScore,
    startAttempt,
    saveAnswer,
    getAnswer,
    goToNext,
    goToPrev,
    goToQuestion,
    submitQuiz,
    updateGamifiedScore,
    setCurrentIndex,
  };
}
