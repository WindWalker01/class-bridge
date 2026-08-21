import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useQuizTaking } from "@/hooks/useQuizTaking";
import type { MCQOption, Question } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const accent = getAccent("student");

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Start Screen
// ---------------------------------------------------------------------------

function StartScreen({
  quizTitle,
  quizDescription,
  mode,
  questionCount,
  totalPoints,
  timeLimit,
  onStart,
  loading,
}: {
  quizTitle: string;
  quizDescription: string | null;
  mode: string;
  questionCount: number;
  totalPoints: number;
  timeLimit: number | null;
  onStart: () => void;
  loading: boolean;
}) {
  const modeLabels: Record<string, { label: string; color: string }> = {
    standard: { label: "Standard", color: "#2563eb" },
    timed: { label: "Timed", color: "#d97706" },
    gamified: { label: "Gamified", color: "#7c3aed" },
  };
  const modeInfo = modeLabels[mode] ?? modeLabels.standard;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View
          style={{
            backgroundColor: modeInfo.color + "18",
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: modeInfo.color, fontWeight: "600" }}
          >
            {modeInfo.label} Mode
          </ThemedText>
        </View>
        <ThemedText variant="title" style={{ textAlign: "center" }}>
          {quizTitle}
        </ThemedText>
        {quizDescription ? (
          <ThemedText muted style={{ textAlign: "center" }}>
            {quizDescription}
          </ThemedText>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <ThemedText variant="caption" muted>
            Questions
          </ThemedText>
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>
            {questionCount}
          </ThemedText>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <ThemedText variant="caption" muted>
            Total Points
          </ThemedText>
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>
            {totalPoints}
          </ThemedText>
        </View>
        {timeLimit && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <ThemedText variant="caption" muted>
              Time Limit
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: "600" }}>
              {Math.floor(timeLimit / 60)} min
            </ThemedText>
          </View>
        )}
        {mode === "gamified" && (
          <View
            style={{
              backgroundColor: "#f3e8ff",
              borderRadius: radii.sm,
              padding: spacing.sm,
            }}
          >
            <ThemedText variant="small" style={{ color: "#7c3aed" }}>
              {
                "🎮 Speed bonuses: 2x for <5s, 1.5x for <15s, 1.25x for <30s. Streak tracking enabled!"
              }
            </ThemedText>
          </View>
        )}
      </View>

      <Button
        label="Start Quiz"
        fullWidth
        loading={loading}
        onPress={onStart}
      />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Question Screen
// ---------------------------------------------------------------------------

function QuestionScreen({
  question,
  index,
  total,
  selectedAnswer,
  onAnswer,
  onNext,
  onPrev,
  isFirst,
  isLast,
  mode,
  questionTimeLeft,
  overallTimeLeft,
  streak,
  runningScore,
}: {
  question: Question;
  index: number;
  total: number;
  selectedAnswer: string | boolean | { selectedKey: string } | null;
  onAnswer: (answer: string | boolean | { selectedKey: string }) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  mode: string;
  questionTimeLeft: number | null;
  overallTimeLeft: number | null;
  streak: number;
  runningScore: number;
}) {
  const [mcqSelected, setMcqSelected] = useState<string | null>(
    selectedAnswer &&
      typeof selectedAnswer === "object" &&
      "selectedKey" in selectedAnswer
      ? selectedAnswer.selectedKey
      : null,
  );
  const [tfSelected, setTfSelected] = useState<boolean | null>(
    typeof selectedAnswer === "boolean" ? selectedAnswer : null,
  );
  const [shortText, setShortText] = useState<string>(
    typeof selectedAnswer === "string" ? selectedAnswer : "",
  );

  const handleMCQSelect = (key: string) => {
    setMcqSelected(key);
    onAnswer({ selectedKey: key });
  };

  const handleTFSelect = (value: boolean) => {
    setTfSelected(value);
    onAnswer(value);
  };

  const handleShortAnswer = (text: string) => {
    setShortText(text);
    onAnswer(text);
  };

  const progressPercent = ((index + 1) / total) * 100;

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      {/* Header with timers & progress */}
      <View style={{ gap: spacing.sm }}>
        {/* Progress bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <ThemedText variant="small" muted>
            {index + 1} of {total}
          </ThemedText>
          <View
            style={{
              flex: 1,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
            }}
          >
            <View
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: accent.accent,
                borderRadius: 2,
              }}
            />
          </View>
        </View>

        {/* Timers */}
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {questionTimeLeft !== null && (
            <View
              style={{
                backgroundColor:
                  questionTimeLeft <= 5 ? "#fee2e2" : colors.surfaceMuted,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{
                  fontWeight: "600",
                  color:
                    questionTimeLeft <= 5 ? colors.danger : colors.textMuted,
                }}
              >
                ⏱ {questionTimeLeft}s
              </ThemedText>
            </View>
          )}
          {overallTimeLeft !== null && (
            <View
              style={{
                backgroundColor:
                  overallTimeLeft <= 60 ? "#fee2e2" : colors.surfaceMuted,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{
                  fontWeight: "600",
                  color:
                    overallTimeLeft <= 60 ? colors.danger : colors.textMuted,
                }}
              >
                🕐 {formatTime(overallTimeLeft)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Gamified HUD */}
        {mode === "gamified" && (
          <View
            style={{
              flexDirection: "row",
              gap: spacing.md,
            }}
          >
            <View
              style={{
                backgroundColor: "#f3e8ff",
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: "#7c3aed", fontWeight: "600" }}
              >
                🔥 {streak} streak
              </ThemedText>
            </View>
            <View
              style={{
                backgroundColor: "#dcfce7",
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: colors.success, fontWeight: "600" }}
              >
                ⭐ {runningScore} pts
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* Question card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
          flex: 1,
        }}
      >
        <View
          style={{
            backgroundColor: accent.accentSoft,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            alignSelf: "flex-start",
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: accent.accentText, fontWeight: "600" }}
          >
            {question.points} {question.points === 1 ? "point" : "points"}
          </ThemedText>
        </View>

        <ThemedText variant="body" style={{ fontWeight: "500" }}>
          {question.prompt}
        </ThemedText>

        {/* MCQ Options */}
        {question.type === "mcq" && question.options && (
          <View style={{ gap: spacing.sm }}>
            {(question.options as MCQOption[]).map((option) => {
              const isSelected = mcqSelected === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => handleMCQSelect(option.key)}
                  style={{
                    backgroundColor: isSelected
                      ? accent.accentSoft
                      : colors.surfaceMuted,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: isSelected ? accent.accent : colors.border,
                    padding: spacing.md,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? accent.accent
                        : colors.textMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: accent.accent,
                        }}
                      />
                    )}
                  </View>
                  <ThemedText
                    variant="body"
                    style={{
                      fontWeight: isSelected ? "600" : "400",
                      flex: 1,
                    }}
                  >
                    {option.key}. {option.text}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* True/False */}
        {question.type === "true_false" && (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Pressable
              onPress={() => handleTFSelect(true)}
              style={{
                flex: 1,
                backgroundColor:
                  tfSelected === true ? "#dcfce7" : colors.surfaceMuted,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor:
                  tfSelected === true ? colors.success : colors.border,
                padding: spacing.lg,
                alignItems: "center",
              }}
            >
              <ThemedText
                variant="body"
                style={{
                  fontWeight: tfSelected === true ? "600" : "400",
                  color:
                    tfSelected === true ? colors.success : colors.textMuted,
                }}
              >
                True
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleTFSelect(false)}
              style={{
                flex: 1,
                backgroundColor:
                  tfSelected === false ? "#fee2e2" : colors.surfaceMuted,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor:
                  tfSelected === false ? colors.danger : colors.border,
                padding: spacing.lg,
                alignItems: "center",
              }}
            >
              <ThemedText
                variant="body"
                style={{
                  fontWeight: tfSelected === false ? "600" : "400",
                  color:
                    tfSelected === false ? colors.danger : colors.textMuted,
                }}
              >
                False
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Short Answer */}
        {question.type === "short_answer" && (
          <TextField
            label="Your Answer"
            placeholder="Type your answer..."
            value={shortText}
            onChangeText={handleShortAnswer}
            multiline
          />
        )}
      </View>

      {/* Navigation */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <Button
          label="Previous"
          variant="ghost"
          fullWidth
          onPress={onPrev}
          disabled={isFirst}
        />
        <Button label={isLast ? "Review" : "Next"} fullWidth onPress={onNext} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Review Screen
// ---------------------------------------------------------------------------

function ReviewScreen({
  questions,
  answers,
  onSubmit,
  submitting,
  onBackToQuestion,
}: {
  questions: Question[];
  answers: Map<string, string | boolean | { selectedKey: string }>;
  onSubmit: () => void;
  submitting: boolean;
  onBackToQuestion: (index: number) => void;
}) {
  const answeredCount = answers.size;
  const unansweredCount = questions.length - answeredCount;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.md }}
    >
      <View style={{ paddingTop: spacing.lg }}>
        <ThemedText variant="heading" style={{ marginBottom: spacing.xs }}>
          Review Your Answers
        </ThemedText>
        <ThemedText variant="caption" muted>
          {answeredCount} of {questions.length} answered
          {unansweredCount > 0 && ` • ${unansweredCount} unanswered`}
        </ThemedText>
      </View>

      {questions.map((question, index) => {
        const answer = answers.get(question.id);
        const isAnswered = answer !== undefined;

        const getAnswerPreview = (): string => {
          if (!answer) return "Not answered";
          if (typeof answer === "object" && "selectedKey" in answer) {
            const option = (question.options as MCQOption[])?.find(
              (o) => o.key === answer.selectedKey,
            );
            return option
              ? `${answer.selectedKey}. ${option.text}`
              : answer.selectedKey;
          }
          if (typeof answer === "boolean") return answer ? "True" : "False";
          return String(answer);
        };

        return (
          <Pressable
            key={question.id}
            onPress={() => onBackToQuestion(index)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: isAnswered ? accent.accent : colors.border,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText variant="caption" style={{ fontWeight: "600" }}>
                Q{index + 1}
              </ThemedText>
              {isAnswered ? (
                <View
                  style={{
                    backgroundColor: "#dcfce7",
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <ThemedText
                    variant="small"
                    style={{ color: colors.success, fontWeight: "600" }}
                  >
                    ✓ Answered
                  </ThemedText>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: "#fee2e2",
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <ThemedText
                    variant="small"
                    style={{ color: colors.danger, fontWeight: "600" }}
                  >
                    ! Unanswered
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText variant="body" numberOfLines={2}>
              {question.prompt}
            </ThemedText>
            <ThemedText variant="small" muted>
              Your answer: {getAnswerPreview()}
            </ThemedText>
            <ThemedText
              variant="small"
              style={{ color: accent.accentText, fontWeight: "600" }}
            >
              Tap to change →
            </ThemedText>
          </Pressable>
        );
      })}

      <Button
        label="Submit Quiz"
        fullWidth
        loading={submitting}
        onPress={onSubmit}
      />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Results Screen
// ---------------------------------------------------------------------------

function ResultsScreen({
  score,
  maxScore,
  onViewLeaderboard,
  onBackToQuizzes,
}: {
  score: number | null;
  maxScore: number | null;
  onViewLeaderboard: () => void;
  onBackToQuizzes: () => void;
}) {
  const percent =
    score !== null && maxScore !== null && maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : null;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor:
            percent !== null && percent >= 70 ? "#dcfce7" : "#fee2e2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ThemedText
          variant="display"
          style={{
            color:
              percent !== null && percent >= 70
                ? colors.success
                : colors.danger,
          }}
        >
          {percent !== null ? `${percent}%` : "—"}
        </ThemedText>
      </View>

      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <ThemedText variant="title">Quiz Submitted!</ThemedText>
        <ThemedText variant="body" muted>
          Score: {score ?? "—"} / {maxScore ?? "—"}
        </ThemedText>
      </View>

      <View style={{ width: "100%", gap: spacing.md }}>
        <Button
          label="View Leaderboard"
          fullWidth
          onPress={onViewLeaderboard}
        />
        <Button
          label="Back to Quizzes"
          variant="ghost"
          fullWidth
          onPress={onBackToQuizzes}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Take Quiz Screen
// ---------------------------------------------------------------------------

export default function TakeQuizScreen() {
  const { id, quizId } = useLocalSearchParams<{ id: string; quizId: string }>();
  const classId = id ?? "";

  const {
    quiz,
    questions,
    attempt,
    answers,
    currentIndex,
    currentQuestion,
    totalQuestions,
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
    setCurrentIndex,
  } = useQuizTaking(quizId ?? "");

  const [showReview, setShowReview] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Per-question timer for timed mode
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set up per-question timer
  useEffect(() => {
    if (
      quiz?.mode === "timed" &&
      currentQuestion?.time_limit_seconds &&
      attempt?.status === "in_progress" &&
      !showReview
    ) {
      setQuestionTimeLeft(currentQuestion.time_limit_seconds);

      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (questionTimerRef.current)
              clearInterval(questionTimerRef.current);
            // Auto-advance
            if (!isLastQuestion) {
              goToNext();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQuestionTimeLeft(null);
    }

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [
    currentIndex,
    currentQuestion?.id,
    quiz?.mode,
    attempt?.status,
    showReview,
  ]);

  // Show results when graded
  useEffect(() => {
    if (isGraded) {
      setShowResults(true);
      setShowReview(false);
    }
  }, [isGraded]);

  const handleStart = async () => {
    await startAttempt();
  };

  const handleAnswer = (answer: string | boolean | { selectedKey: string }) => {
    if (!currentQuestion) return;
    void saveAnswer(currentQuestion.id, answer);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowReview(true);
    } else {
      goToNext();
    }
  };

  const handleBackToQuestion = (index: number) => {
    setShowReview(false);
    setCurrentIndex(index);
  };

  const handleSubmit = async () => {
    await submitQuiz();
  };

  const handleViewLeaderboard = () => {
    router.replace(
      `/(student)/class/${classId}/quizzes/${quizId}/leaderboard` as any,
    );
  };

  const handleBackToQuizzes = () => {
    router.replace(`/(student)/class/${classId}/quizzes` as any);
  };

  // Build answers map for review
  const answersMap = new Map<
    string,
    string | boolean | { selectedKey: string }
  >();
  for (const a of answers) {
    if (a.response !== null && a.response !== undefined) {
      answersMap.set(a.question_id, a.response);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={accent.accent} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
        >
          <ThemedText variant="heading" style={{ marginBottom: spacing.sm }}>
            Error
          </ThemedText>
          <ThemedText
            muted
            style={{ textAlign: "center", marginBottom: spacing.lg }}
          >
            {error}
          </ThemedText>
          <Button label="Go Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // Results screen
  if (showResults && attempt) {
    return (
      <Screen>
        <ResultsScreen
          score={attempt.score}
          maxScore={attempt.max_score}
          onViewLeaderboard={handleViewLeaderboard}
          onBackToQuizzes={handleBackToQuizzes}
        />
      </Screen>
    );
  }

  // Review screen
  if (showReview && !isSubmitted) {
    return (
      <Screen>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingTop: spacing.lg,
              paddingBottom: spacing.md,
            }}
          >
            <Pressable onPress={() => setShowReview(false)}>
              <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
            </Pressable>
            <ThemedText variant="heading">Review</ThemedText>
          </View>
          <ReviewScreen
            questions={questions}
            answers={answersMap}
            onSubmit={handleSubmit}
            submitting={submitting}
            onBackToQuestion={handleBackToQuestion}
          />
        </View>
      </Screen>
    );
  }

  // Start screen
  if (!attempt) {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    return (
      <Screen>
        <StartScreen
          quizTitle={quiz?.title ?? ""}
          quizDescription={quiz?.description ?? null}
          mode={quiz?.mode ?? "standard"}
          questionCount={questions.length}
          totalPoints={totalPoints}
          timeLimit={quiz?.time_limit_seconds ?? null}
          onStart={handleStart}
          loading={loading}
        />
      </Screen>
    );
  }

  // Already submitted (but not yet graded)
  if (isSubmitted && !isGraded) {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
        >
          <ActivityIndicator size="large" color={accent.accent} />
          <ThemedText variant="body" style={{ marginTop: spacing.md }}>
            Grading your quiz...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  // Question screen
  if (!currentQuestion) {
    return (
      <Screen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ThemedText muted>No questions available.</ThemedText>
        </View>
      </Screen>
    );
  }

  const currentAnswer = getAnswer(currentQuestion.id);
  const selectedAnswer = currentAnswer?.response ?? null;

  return (
    <Screen>
      <QuestionScreen
        question={currentQuestion}
        index={currentIndex}
        total={totalQuestions}
        selectedAnswer={selectedAnswer}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onPrev={goToPrev}
        isFirst={isFirstQuestion}
        isLast={isLastQuestion}
        mode={quiz?.mode ?? "standard"}
        questionTimeLeft={questionTimeLeft}
        overallTimeLeft={overallTimeLeft}
        streak={streak}
        runningScore={runningScore}
      />
    </Screen>
  );
}
