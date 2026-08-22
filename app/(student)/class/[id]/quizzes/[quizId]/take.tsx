import { router, useLocalSearchParams } from "expo-router";
import { Check, X, Zap } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import {
  AnimatedListItem,
  AnimatedScore,
  Button,
  Card,
  CircularProgress,
  FadeInUp,
  ParticleBurst,
  ScaleInView,
  Screen,
  ScreenHeader,
  SkeletonCard,
  TextField,
  ThemedText,
  usePressAnimation,
  useToast,
} from "@/components";
import { modeColor, radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { haptics } from "@/lib/haptics";
import { useQuizTaking } from "@/hooks/useQuizTaking";
import type { MCQOption, Question } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  dueAt,
  onStart,
  loading,
}: {
  quizTitle: string;
  quizDescription: string | null;
  mode: string;
  questionCount: number;
  totalPoints: number;
  timeLimit: number | null;
  dueAt: string | null;
  onStart: () => void;
  loading: boolean;
}) {
  const { resolvedMode } = useTheme();
  const modeLabels: Record<string, { label: string; color: string }> = {
    standard: {
      label: "Standard",
      color: modeColor(resolvedMode, "#2563eb", "#60a5fa"),
    },
    timed: {
      label: "Timed",
      color: modeColor(resolvedMode, "#d97706", "#fbbf24"),
    },
    gamified: {
      label: "Gamified",
      color: modeColor(resolvedMode, "#7c3aed", "#a78bfa"),
    },
  };
  const modeInfo = modeLabels[mode] ?? modeLabels.standard;
  const isOverdue = dueAt ? new Date(dueAt) < new Date() : false;

  return (
    <View style={{ flex: 1 }}>
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

        <Card variant="flat">
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
          {dueAt && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <ThemedText variant="caption" muted>
                Deadline
              </ThemedText>
              <ThemedText
                variant="caption"
                style={{
                  fontWeight: "600",
                  color: isOverdue
                    ? modeColor(resolvedMode, "#dc2626", "#f87171")
                    : undefined,
                }}
              >
                {new Date(dueAt).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {isOverdue ? " (Past)" : ""}
              </ThemedText>
            </View>
          )}
          {mode === "gamified" && (
            <View
              style={{
                backgroundColor: modeColor(resolvedMode, "#f3e8ff", "#3b0764"),
                borderRadius: radii.sm,
                padding: spacing.sm,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: modeColor(resolvedMode, "#7c3aed", "#c4b5fd") }}
              >
                {
                  "🎮 Speed bonuses: 2x for <5s, 1.5x for <15s, 1.25x for <30s. Streak tracking enabled!"
                }
              </ThemedText>
            </View>
          )}
        </Card>

        {isOverdue && (
          <View
            style={{
              backgroundColor: modeColor(resolvedMode, "#fef2f2", "#450a0a"),
              borderRadius: radii.sm,
              padding: spacing.sm,
            }}
          >
            <ThemedText
              variant="small"
              style={{ color: modeColor(resolvedMode, "#dc2626", "#f87171") }}
            >
              This quiz deadline has passed. You can no longer start this quiz.
            </ThemedText>
          </View>
        )}

        <Button
          label={isOverdue ? "Deadline Passed" : "Start Quiz"}
          fullWidth
          loading={loading}
          disabled={isOverdue}
          onPress={onStart}
        />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MCQOptionItem — animated, haptic-feedback option button
// ---------------------------------------------------------------------------

function MCQOptionItem({
  option,
  isSelected,
  onSelect,
}: {
  option: MCQOption;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) {
  const { colors, accent } = useTheme();
  const { animatedStyle, pressIn, pressOut } = usePressAnimation({
    hapticOnPress: !isSelected, // haptic only on first select
    scale: 0.97,
  });

  return (
    <Pressable
      key={option.key}
      onPress={() => onSelect(option.key)}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View
        style={[
          {
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
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: isSelected ? accent.accent : colors.textMuted,
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
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// TrueFalseButton — animated haptic T/F button
// ---------------------------------------------------------------------------

function TrueFalseButton({
  label,
  isSelected,
  onPress,
  selectedColor,
  borderColor,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  selectedColor: string;
  borderColor: string;
}) {
  const { colors } = useTheme();
  const { animatedStyle, pressIn, pressOut } = usePressAnimation({
    hapticOnPress: !isSelected,
    scale: 0.96,
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: isSelected
              ? selectedColor
              : colors.surfaceMuted,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: isSelected ? borderColor : colors.border,
            padding: spacing.lg,
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <ThemedText
          variant="body"
          style={{
            fontWeight: isSelected ? "600" : "400",
            color: isSelected ? borderColor : colors.textMuted,
          }}
        >
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// AnimatedTimer — circular progress ring for question countdown with
// color transitions and a low-time pulse+haptic warning.
// ---------------------------------------------------------------------------

function AnimatedTimer({
  timeLeft,
  totalSeconds,
}: {
  timeLeft: number;
  totalSeconds: number;
}) {
  const { colors } = useTheme();
  const progress = (timeLeft / totalSeconds) * 100;
  const pulseScale = useSharedValue(1);
  const hasWarned = useRef(false);

  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !hasWarned.current) {
      hasWarned.current = true;
      haptics.warning();
      pulseScale.value = withSequence(
        withSpring(1.1, { stiffness: 200, damping: 10 }),
        withSpring(1, { stiffness: 300, damping: 15 }),
      );
    }
    if (timeLeft > 3) {
      hasWarned.current = false;
    }
  }, [timeLeft, pulseScale]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={animatedRingStyle}>
      <CircularProgress
        progress={progress}
        size={40}
        strokeWidth={4}
        activeColor={colors.success}
        warningColor={colors.warning}
        dangerColor={colors.danger}
        warningThreshold={30}
        dangerThreshold={10}
        duration={500}
      >
        <ThemedText
          variant="small"
          style={{
            fontWeight: "700",
            color:
              timeLeft <= 3
                ? colors.danger
                : timeLeft <= 10
                  ? colors.warning
                  : colors.text,
          }}
        >
          {timeLeft}
        </ThemedText>
      </CircularProgress>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AnimatedStreakBadge — flame icon that scales with streak length
// ---------------------------------------------------------------------------

function AnimatedStreakBadge({ streak }: { streak: number }) {
  const { resolvedMode } = useTheme();
  const flameScale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      flameScale.value = withSequence(
        withSpring(1.4, { stiffness: 200, damping: 10 }),
        withSpring(1, { stiffness: 300, damping: 15 }),
      );
    }
  }, [streak, flameScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  // Scale flame icon size based on streak length
  const flameSize = Math.min(14 + streak * 2, 24);

  return (
    <Animated.View style={animatedStyle}>
      <Zap
        size={flameSize}
        color={modeColor(resolvedMode, "#7c3aed", "#a78bfa")}
        strokeWidth={2.5}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// SpeedBonusIndicator — brief toast-like banner for speed bonuses
// ---------------------------------------------------------------------------

let SpeedBonusIndicator: React.FC<{
  bonusMultiplier: number;
  visible: boolean;
}>;

// We define it as a placeholder — it's used in gamified mode when a fast
// correct answer earns bonus points. Rendered as an overlay in the
// TakeQuizScreen main flow.
SpeedBonusIndicator = function SpeedBonusIndicator({
  bonusMultiplier,
  visible,
}) {
  const { resolvedMode } = useTheme();
  if (!visible) return null;
  return (
    <ScaleInView>
      <View
        style={{
          backgroundColor: modeColor(resolvedMode, "#f3e8ff", "#3b0764"),
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          alignSelf: "flex-start",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Zap size={14} color={modeColor(resolvedMode, "#7c3aed", "#a78bfa")} />
          <ThemedText
            variant="small"
            style={{
              color: modeColor(resolvedMode, "#7c3aed", "#c4b5fd"),
              fontWeight: "700",
            }}
          >
            {bonusMultiplier}x Speed Bonus!
          </ThemedText>
        </View>
      </View>
    </ScaleInView>
  );
};

// ---------------------------------------------------------------------------
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
  speedBonus,
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
  speedBonus: { multiplier: number } | null;
}) {
  const { colors, accent, resolvedMode } = useTheme();
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
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          {questionTimeLeft !== null && (
            <AnimatedTimer
              timeLeft={questionTimeLeft}
              totalSeconds={question?.time_limit_seconds ?? 30}
            />
          )}
          {overallTimeLeft !== null && (
            <View
              style={{
                backgroundColor:
                  overallTimeLeft <= 60
                    ? colors.danger + "18"
                    : colors.surfaceMuted,
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
          <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
            {/* Streak badge with animated flame */}
            <View
              style={{
                backgroundColor: "#f3e8ff",
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <AnimatedStreakBadge streak={streak} />
              <ThemedText
                variant="small"
                style={{ color: "#7c3aed", fontWeight: "600" }}
              >
                {streak} streak
              </ThemedText>
            </View>
            {/* Animated score */}
            <View
              style={{
                backgroundColor: colors.success + "18",
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: colors.success, fontWeight: "600" }}
              >
                ⭐{" "}
              </ThemedText>
              <AnimatedScore
                value={runningScore}
                duration={400}
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "600",
                  color: colors.success,
                }}
                suffix=" pts"
              />
            </View>
          </View>
        )}

        {/* Speed bonus indicator */}
        {mode === "gamified" && speedBonus && (
          <SpeedBonusIndicator
            bonusMultiplier={speedBonus.multiplier}
            visible={true}
          />
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
            {(question.options as MCQOption[]).map((option) => (
              <MCQOptionItem
                key={option.key}
                option={option}
                isSelected={mcqSelected === option.key}
                onSelect={handleMCQSelect}
              />
            ))}
          </View>
        )}

        {/* True/False */}
        {question.type === "true_false" && (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <TrueFalseButton
              label="True"
              isSelected={tfSelected === true}
              onPress={() => handleTFSelect(true)}
              selectedColor={colors.success + "22"}
              borderColor={colors.success}
            />
            <TrueFalseButton
              label="False"
              isSelected={tfSelected === false}
              onPress={() => handleTFSelect(false)}
              selectedColor={colors.danger + "22"}
              borderColor={colors.danger}
            />
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
  isGraded,
  correctAnswerMap,
}: {
  questions: Question[];
  answers: Map<string, string | boolean | { selectedKey: string }>;
  onSubmit: () => void;
  submitting: boolean;
  onBackToQuestion: (index: number) => void;
  isGraded?: boolean;
  correctAnswerMap?: Map<string, string | boolean | { key: string }>;
}) {
  const { colors, accent } = useTheme();
  const answeredCount = answers.size;
  const unansweredCount = questions.length - answeredCount;

  // Track which items have been animated in
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());

  const getCorrectAnswerText = (question: Question): string => {
    if (!correctAnswerMap) return "";
    const correctAns = correctAnswerMap.get(question.id);
    if (correctAns === undefined) return "";

    if (typeof correctAns === "string" && question.options) {
      const opt = (question.options as MCQOption[])?.find(
        (o) => o.key === correctAns,
      );
      return opt ? `${opt.key}. ${opt.text}` : correctAns;
    }
    if (typeof correctAns === "boolean")
      return correctAns ? "True" : "False";
    if (typeof correctAns === "object" && (correctAns as any)?.key) {
      const key = (correctAns as any).key;
      const opt = (question.options as MCQOption[])?.find((o) => o.key === key);
      return opt ? `${opt.key}. ${opt.text}` : key;
    }
    return String(correctAns);
  };

  const getAnswerPreview = (question: Question, answer: any): string => {
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

  const isCorrect = (question: Question, answer: any): boolean | null => {
    if (!answer || !correctAnswerMap) return null;
    const correctAns = correctAnswerMap.get(question.id);
    if (correctAns === undefined) return null;

    // Compare based on question type
    if (typeof answer === "object" && "selectedKey" in answer) {
      return answer.selectedKey === correctAns;
    }
    return answer === correctAns;
  };

  const gradePercentage =
    isGraded && correctAnswerMap
      ? Math.round(
          (questions.filter((q) => {
            const ans = answers.get(q.id);
            return ans && isCorrect(q, ans) === true;
          }).length /
            questions.length) *
            100,
        )
      : null;

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
        const correct = isGraded && correctAnswerMap ? isCorrect(question, answer) : null;
        const showCorrectAnim = correct === true;
        const showIncorrectAnim = correct === false;

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
              {isGraded && correct !== null ? (
                <Animated.View
                  entering={ZoomIn.duration(300).springify()}
                >
                  {showCorrectAnim ? (
                    <View
                      style={{
                        backgroundColor: colors.success + "18",
                        borderRadius: radii.pill,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Check size={14} color={colors.success} strokeWidth={3} />
                      <ThemedText
                        variant="small"
                        style={{ color: colors.success, fontWeight: "600" }}
                      >
                        Correct
                      </ThemedText>
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: colors.danger + "18",
                        borderRadius: radii.pill,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <X size={14} color={colors.danger} strokeWidth={3} />
                      <ThemedText
                        variant="small"
                        style={{ color: colors.danger, fontWeight: "600" }}
                      >
                        Incorrect
                      </ThemedText>
                    </View>
                  )}
                </Animated.View>
              ) : isAnswered ? (
                <View
                  style={{
                    backgroundColor: colors.success + "18",
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
                    backgroundColor: colors.danger + "18",
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
              Your answer: {getAnswerPreview(question, answer)}
            </ThemedText>
            {isGraded && correct !== null ? (
                <ThemedText
                  variant="small"
                  style={{
                    color: correct
                      ? colors.success
                      : colors.danger,
                    fontWeight: "500",
                  }}
                >
                  {correct
                    ? "Correct"
                    : `Incorrect — ${getCorrectAnswerText(question)}`}
                </ThemedText>
              ) : (
                <ThemedText
                  variant="small"
                  style={{ color: accent.accentText, fontWeight: "600" }}
                >
                  Tap to change →
                </ThemedText>
              )}
          </Pressable>
        );
      })}

      {!isGraded && (
        <Button
          label="Submit Quiz"
          fullWidth
          loading={submitting}
          onPress={onSubmit}
        />
      )}
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
  const isStrongScore = percent !== null && percent >= 80;
  const [confettiActive, setConfettiActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    // Trigger reveal animation with a short delay for dramatic effect
    const timer = setTimeout(() => {
      setRevealed(true);
      if (isStrongScore) {
        setConfettiActive(true);
        haptics.success();
      } else if (percent !== null) {
        haptics.light();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // The progress ring fills from 0 → percent
  const displayProgress = revealed && percent !== null ? percent : 0;

  return (
    <ParticleBurst
      active={confettiActive}
      config={{ count: 30, duration: 1000 }}
      onComplete={() => setConfettiActive(false)}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.lg,
          gap: spacing.lg,
        }}
      >
        {/* Animated circular score ring */}
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <CircularProgress
            progress={displayProgress}
            size={140}
            strokeWidth={10}
            activeColor={isStrongScore ? colors.success : colors.text}
            trackColor={colors.surfaceMuted}
            duration={1000}
          >
            <View style={{ alignItems: "center", gap: spacing.xs }}>
              {revealed && percent !== null ? (
                <AnimatedScore
                  value={percent}
                  duration={1000}
                  style={{
                    fontSize: 34,
                    lineHeight: 41,
                    fontWeight: "700",
                    color: isStrongScore ? colors.success : colors.text,
                  }}
                  suffix="%"
                />
              ) : (
                <ThemedText
                  variant="title"
                  style={{
                    color: colors.textMuted,
                  }}
                >
                  —
                </ThemedText>
              )}
            </View>
          </CircularProgress>
        </View>

        <View style={{ alignItems: "center", gap: spacing.xs }}>
          {revealed ? (
            <>
              <ThemedText variant="title">
                {isStrongScore ? "Great Job!" : "Quiz Submitted!"}
              </ThemedText>
              {!isStrongScore && (
                <ThemedText variant="body" muted style={{ textAlign: "center" }}>
                  Keep practicing — you'll get there!
                </ThemedText>
              )}
            </>
          ) : (
            <ThemedText variant="body" muted>
              Calculating...
            </ThemedText>
          )}
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
    </ParticleBurst>
  );
}

// ---------------------------------------------------------------------------
// Error Redirect Component
// ---------------------------------------------------------------------------

/** Renders a blank screen and fires the Toast + nav-back inside an effect. */
function ErrorRedirect({ message }: { message: string }) {
  const { show } = useToast();

  useEffect(() => {
    show(message, { type: "error" });
    router.back();
  }, [message]);

  return (
    <Screen>
      <View style={{ flex: 1 }} />
    </Screen>
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
  const [showGradedReview, setShowGradedReview] = useState(false);
  const { colors } = useTheme();
  const [correctAnswerMap, setCorrectAnswerMap] = useState<
    Map<string, string | boolean | { key: string }> | null
  >(null);

  // Speed bonus indicator for gamified mode
  const [speedBonus, setSpeedBonus] = useState<{ multiplier: number } | null>(null);
  const speedBonusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-question timer for timed mode
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local question start time for speed bonus calculation
  const questionStartTimeRef = useRef<number>(Date.now());

  // Update question start time when navigating
  const handleNextLocal = () => {
    if (isLastQuestion) {
      setShowReview(true);
    } else {
      goToNext();
      questionStartTimeRef.current = Date.now();
    }
  };

  const handlePrevLocal = () => {
    goToPrev();
    questionStartTimeRef.current = Date.now();
  };

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

  // Show graded review when graded
  useEffect(() => {
    if (isGraded && attempt) {
      // Build correct answer map
      const map = new Map<string, string | boolean | { key: string }>();
      for (const q of questions) {
        map.set(q.id, q.correct_answer as any);
      }
      setCorrectAnswerMap(map);
      setShowGradedReview(true);
      setShowReview(false);
    }
  }, [isGraded, attempt, questions]);

  const handleStart = async () => {
    haptics.medium();
    await startAttempt();
  };

  const handleAnswer = (answer: string | boolean | { selectedKey: string }) => {
    if (!currentQuestion) return;
    void saveAnswer(currentQuestion.id, answer);

    // Speed bonus calculation for gamified mode
    if (quiz?.mode === "gamified") {
      const answerTimeMs = Date.now() - questionStartTimeRef.current;
      const answerTimeSec = answerTimeMs / 1000;

      // Determine speed bonus multiplier
      let multiplier = 0;
      if (answerTimeSec < 5) multiplier = 2;
      else if (answerTimeSec < 15) multiplier = 1.5;
      else if (answerTimeSec < 30) multiplier = 1.25;

      if (multiplier > 1) {
        // Clear any existing timer
        if (speedBonusTimerRef.current) clearTimeout(speedBonusTimerRef.current);
        setSpeedBonus({ multiplier });

        // Auto-hide after 2 seconds
        speedBonusTimerRef.current = setTimeout(() => {
          setSpeedBonus(null);
        }, 2000);
      }
    }
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
const handleViewResults = () => {
    setShowGradedReview(false);
    setShowResults(true);
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
          style={{
            flex: 1,
            justifyContent: "center",
            paddingTop: spacing.xxl,
          }}
        >
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </Screen>
    );
  }

  if (error) {
    // Show error via Toast and redirect back via effect
    return <ErrorRedirect message={error} />;
  }

  // Graded review screen
  if (showGradedReview && correctAnswerMap) {
    return (
      <Screen>
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Graded Review"
            onBack={() => setShowGradedReview(false)}
          />
          <ReviewScreen
            questions={questions}
            answers={answersMap}
            onSubmit={() => {}}
            submitting={false}
            onBackToQuestion={() => {}}
            isGraded={true}
            correctAnswerMap={correctAnswerMap}
          />
          <View style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Button
              label="View Results"
              fullWidth
              onPress={handleViewResults}
            />
          </View>
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
          <ScreenHeader
            title="Review"
            onBack={() => setShowReview(false)}
          />
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
          dueAt={quiz?.due_at ?? null}
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
          <ThemedText variant="body" muted>
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
        onNext={handleNextLocal}
        onPrev={handlePrevLocal}
        isFirst={isFirstQuestion}
        isLast={isLastQuestion}
        mode={quiz?.mode ?? "standard"}
        questionTimeLeft={questionTimeLeft}
        overallTimeLeft={overallTimeLeft}
        streak={streak}
        runningScore={runningScore}
        speedBonus={speedBonus}
      />
    </Screen>
  );
}
