import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { AlertCircle } from "lucide-react-native";

import {
  AnimatedListItem,
  Button,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  SkeletonCard,
  SkeletonText,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import DraggableQuestionList from "@/components/DraggableQuestionList";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useQuizBuilder } from "@/hooks/useQuizBuilder";
import type { MCQOption, Question, QuestionType } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const accent = getAccent("teacher");

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  true_false: "True / False",
  short_answer: "Short Answer",
};

const MODE_LABELS: Record<string, string> = {
  standard: "Standard",
  timed: "Timed",
  gamified: "Gamified",
};

// ---------------------------------------------------------------------------
// Question Form (inline add/edit)
// ---------------------------------------------------------------------------

function QuestionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Question;
  onSave: (data: {
    type: QuestionType;
    prompt: string;
    options?: MCQOption[];
    correct_answer: string | boolean | { key: string };
    points: number;
    time_limit_seconds: number | null;
  }) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "mcq");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [timeLimit, setTimeLimit] = useState(
    initial?.time_limit_seconds ? String(initial.time_limit_seconds) : "",
  );

  // MCQ state
  const [options, setOptions] = useState<MCQOption[]>(
    (initial?.options as MCQOption[]) ?? [
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ],
  );
  const [correctKey, setCorrectKey] = useState<string>(
    typeof initial?.correct_answer === "object" &&
      initial?.correct_answer !== null &&
      "key" in initial.correct_answer
      ? (initial.correct_answer as { key: string }).key
      : "A",
  );

  // True/False state
  const [tfAnswer, setTfAnswer] = useState<boolean>(
    typeof initial?.correct_answer === "boolean"
      ? initial.correct_answer
      : true,
  );

  // Short answer state
  const [shortAnswer, setShortAnswer] = useState<string>(
    typeof initial?.correct_answer === "string" ? initial.correct_answer : "",
  );

  const [error, setError] = useState("");

  const handleSave = () => {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    let correct_answer: string | boolean | { key: string };

    if (type === "mcq") {
      if (options.some((o) => !o.text.trim())) {
        setError("All options must have text");
        return;
      }
      correct_answer = { key: correctKey };
    } else if (type === "true_false") {
      correct_answer = tfAnswer;
    } else {
      if (!shortAnswer.trim()) {
        setError("Correct answer is required");
        return;
      }
      correct_answer = shortAnswer.trim();
    }

    onSave({
      type,
      prompt: prompt.trim(),
      options: type === "mcq" ? options : undefined,
      correct_answer,
      points: parseInt(points, 10) || 1,
      time_limit_seconds: timeLimit ? parseInt(timeLimit, 10) : null,
    });
  };

  const updateOption = (key: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));
  };

  const addOption = () => {
    const nextKey = String.fromCharCode(65 + options.length);
    setOptions((prev) => [...prev, { key: nextKey, text: "" }]);
  };

  const removeOption = (key: string) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.key !== key));
    if (correctKey === key) {
      setCorrectKey(options[0].key === key ? options[1].key : options[0].key);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <ThemedText variant="heading">
        {initial ? "Edit Question" : "Add Question"}
      </ThemedText>

      {/* Type selector */}
      <View>
        <ThemedText
          variant="small"
          style={{ fontWeight: "600", marginBottom: spacing.xs }}
        >
          Question Type
        </ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["mcq", "true_false", "short_answer"] as QuestionType[]).map(
            (t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={{
                  flex: 1,
                  backgroundColor:
                    type === t ? accent.accentSoft : colors.surfaceMuted,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: type === t ? accent.accent : colors.border,
                  paddingVertical: spacing.sm,
                  alignItems: "center",
                }}
              >
                <ThemedText
                  variant="small"
                  style={{
                    fontWeight: type === t ? "600" : "400",
                    color: type === t ? accent.accentText : colors.textMuted,
                  }}
                >
                  {QUESTION_TYPE_LABELS[t]}
                </ThemedText>
              </Pressable>
            ),
          )}
        </View>
      </View>

      {/* Prompt */}
      <TextField
        label="Question Prompt"
        placeholder="Enter your question"
        value={prompt}
        onChangeText={(text) => {
          setPrompt(text);
          if (error) setError("");
        }}
        multiline
        error={error}
      />

      {/* MCQ Options */}
      {type === "mcq" && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="small" style={{ fontWeight: "600" }}>
            Options
          </ThemedText>
          {options.map((option) => (
            <View
              key={option.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Pressable
                onPress={() => setCorrectKey(option.key)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor:
                    correctKey === option.key
                      ? colors.success
                      : colors.textMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {correctKey === option.key && (
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: colors.success,
                    }}
                  />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <TextField
                  label={`Option ${option.key}`}
                  placeholder={`Enter option ${option.key}`}
                  value={option.text}
                  onChangeText={(text) => updateOption(option.key, text)}
                />
              </View>
              {options.length > 2 && (
                <Pressable
                  onPress={() => removeOption(option.key)}
                  style={{ padding: spacing.xs }}
                >
                  <ThemedText style={{ color: colors.danger, fontSize: 18 }}>
                    ✕
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ))}
          <Button
            label="+ Add Option"
            variant="ghost"
            fullWidth
            onPress={addOption}
          />
        </View>
      )}

      {/* True/False answer */}
      {type === "true_false" && (
        <View>
          <ThemedText
            variant="small"
            style={{ fontWeight: "600", marginBottom: spacing.xs }}
          >
            Correct Answer
          </ThemedText>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => setTfAnswer(true)}
              style={{
                flex: 1,
                backgroundColor:
                  tfAnswer === true ? "#dcfce7" : colors.surfaceMuted,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: tfAnswer === true ? colors.success : colors.border,
                paddingVertical: spacing.sm,
                alignItems: "center",
              }}
            >
              <ThemedText
                style={{
                  fontWeight: tfAnswer === true ? "600" : "400",
                  color: tfAnswer === true ? colors.success : colors.textMuted,
                }}
              >
                True
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setTfAnswer(false)}
              style={{
                flex: 1,
                backgroundColor:
                  tfAnswer === false ? "#fee2e2" : colors.surfaceMuted,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: tfAnswer === false ? colors.danger : colors.border,
                paddingVertical: spacing.sm,
                alignItems: "center",
              }}
            >
              <ThemedText
                style={{
                  fontWeight: tfAnswer === false ? "600" : "400",
                  color: tfAnswer === false ? colors.danger : colors.textMuted,
                }}
              >
                False
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Short answer */}
      {type === "short_answer" && (
        <TextField
          label="Correct Answer"
          placeholder="Enter the correct answer"
          value={shortAnswer}
          onChangeText={setShortAnswer}
        />
      )}

      {/* Points & Time limit */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Points"
            placeholder="1"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Time Limit (sec, optional)"
            placeholder="No limit"
            value={timeLimit}
            onChangeText={setTimeLimit}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button label="Save" fullWidth onPress={handleSave} />
        <Button label="Cancel" variant="ghost" fullWidth onPress={onCancel} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Question Card (display mode)
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getAnswerPreview = (): string => {
    if (question.type === "mcq") {
      const key =
        typeof question.correct_answer === "object" &&
        question.correct_answer !== null &&
        "key" in question.correct_answer
          ? (question.correct_answer as { key: string }).key
          : "?";
      return `Answer: ${key}`;
    }
    if (question.type === "true_false") {
      return `Answer: ${question.correct_answer ? "True" : "False"}`;
    }
    return `Answer: ${question.correct_answer}`;
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
{/* Drag handle row */}
      <View
        style={{
          alignItems: "center",
          paddingBottom: spacing.xs,
          marginBottom: -spacing.xs,
        }}
      >
        <ThemedText
          variant="small"
          muted
          style={{ letterSpacing: 4, fontSize: 18, lineHeight: 12 }}
        >
          ⠿
        </ThemedText>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                backgroundColor: accent.accentSoft,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: accent.accentText, fontWeight: "600" }}
              >
                Q{index + 1}
              </ThemedText>
            </View>
            <View
              style={{
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText variant="small" muted>
                {QUESTION_TYPE_LABELS[question.type]}
              </ThemedText>
            </View>
            <ThemedText variant="small" muted>
              {question.points} pts
            </ThemedText>
            {question.time_limit_seconds && (
              <ThemedText variant="small" muted>
                {question.time_limit_seconds}s
              </ThemedText>
            )}
          </View>
          <ThemedText variant="body" style={{ fontWeight: "500" }}>
            {question.prompt}
          </ThemedText>
          <ThemedText variant="small" style={{ color: colors.success }}>
            {getAnswerPreview()}
          </ThemedText>
        </View>
      </View>

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
        }}
      >
        <Pressable
          onPress={onEdit}
          style={{
            backgroundColor: accent.accentSoft,
            borderRadius: radii.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: accent.accentText, fontWeight: "600" }}
          >
            Edit
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={{
            backgroundColor: "#fee2e2",
            borderRadius: radii.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: colors.danger, fontWeight: "600" }}
          >
            Delete
          </ThemedText>
        </Pressable>
        <View style={{ flex: 1 }} />
        {/* Drag hint */}
        <View
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <ThemedText
            variant="small"
            muted
            style={{ fontSize: 10, lineHeight: 14 }}
          >
            ⟷ drag
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Edit Quiz Screen
// ---------------------------------------------------------------------------

export default function EditQuizScreen() {
  const { id, quizId } = useLocalSearchParams<{ id: string; quizId: string }>();
  const classId = id ?? "";

  const {
    quiz,
    questions,
    loading,
    saving,
    updateQuiz,
    togglePublish,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  } = useQuizBuilder(quizId ?? "");
  const toast = useToast();

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleAddQuestion = async (data: {
    type: QuestionType;
    prompt: string;
    options?: MCQOption[];
    correct_answer: string | boolean | { key: string };
    points: number;
    time_limit_seconds: number | null;
  }) => {
    await addQuestion(data);
    setShowQuestionForm(false);
  };

  const handleUpdateQuestion = async (data: {
    type: QuestionType;
    prompt: string;
    options?: MCQOption[];
    correct_answer: string | boolean | { key: string };
    points: number;
    time_limit_seconds: number | null;
  }) => {
    if (!editingQuestion) return;
    await updateQuestion(editingQuestion.id, data);
    setEditingQuestion(null);
  };

  const handleTogglePublish = async () => {
    const wasPublished = quiz?.status === "published";
    await togglePublish();
    toast.show(wasPublished ? "Quiz unpublished!" : "Quiz published!");
  };

  const handleDeleteQuestion = (questionId: string) => {
    Alert.alert(
      "Delete Question",
      "Are you sure you want to delete this question?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteQuestion(questionId),
        },
      ],
    );
  };

  const handleSaveTitle = async () => {
    if (titleValue.trim()) {
      await updateQuiz({ title: titleValue.trim() });
    }
    setEditTitle(false);
  };

  const handleSaveDesc = async () => {
    await updateQuiz({ description: descValue.trim() || null });
    setEditDesc(false);
  };

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
          <FadeInView>
            <View style={{ gap: spacing.md }}>
              <SkeletonCard />
              <SkeletonText lines={2} />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </FadeInView>
        </View>
      </Screen>
    );
  }

  if (!quiz) {
    return (
      <Screen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ThemedText muted>Quiz not found.</ThemedText>
        </View>
      </Screen>
    );
  }

  const isPublished = quiz.status === "published";

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ScreenHeader
          title="Edit Quiz"
          onBack={() => router.back()}
        />

        {/* Quiz Settings Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          {/* Title */}
          {editTitle ? (
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                alignItems: "flex-end",
              }}
            >
              <View style={{ flex: 1 }}>
                <TextField
                  label="Title"
                  value={titleValue}
                  onChangeText={setTitleValue}
                />
              </View>
              <Button label="Save" onPress={handleSaveTitle} />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setEditTitle(false)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setTitleValue(quiz.title);
                setEditTitle(true);
              }}
            >
              <ThemedText variant="heading">{quiz.title}</ThemedText>
              <ThemedText variant="small" muted>
                Tap to edit
              </ThemedText>
            </Pressable>
          )}

          {/* Description */}
          {editDesc ? (
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                alignItems: "flex-end",
              }}
            >
              <View style={{ flex: 1 }}>
                <TextField
                  label="Description"
                  value={descValue}
                  onChangeText={setDescValue}
                  multiline
                />
              </View>
              <Button label="Save" onPress={handleSaveDesc} />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setEditDesc(false)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setDescValue(quiz.description ?? "");
                setEditDesc(true);
              }}
            >
              <ThemedText variant="body" muted={!quiz.description}>
                {quiz.description || "No description — tap to add"}
              </ThemedText>
            </Pressable>
          )}

          {/* Mode & Status badges */}
          <View
            style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}
          >
            <View
              style={{
                backgroundColor: accent.accentSoft,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: accent.accentText, fontWeight: "600" }}
              >
                {MODE_LABELS[quiz.mode] ?? quiz.mode}
              </ThemedText>
            </View>
            <View
              style={{
                backgroundColor: isPublished ? "#dcfce7" : "#f1f5f9",
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <ThemedText
                variant="small"
                style={{
                  color: isPublished ? colors.success : colors.textMuted,
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}
              >
                {quiz.status}
              </ThemedText>
            </View>
            {quiz.time_limit_seconds && (
              <View
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                }}
              >
                <ThemedText variant="small" muted>
                  {Math.floor(quiz.time_limit_seconds / 60)} min
                </ThemedText>
              </View>
            )}
          </View>

          {/* Publish/Unpublish toggle */}
          <Button
            label={isPublished ? "Unpublish Quiz" : "Publish Quiz"}
            variant={isPublished ? "ghost" : "primary"}
            fullWidth
            loading={saving}
            onPress={handleTogglePublish}
          />
        </View>

        {/* Questions Section */}
        <View style={{ marginBottom: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.md,
            }}
          >
            <ThemedText variant="heading">
              Questions ({questions.length})
            </ThemedText>
            {!showQuestionForm && !editingQuestion && (
              <Button
                label="+ Add Question"
                onPress={() => setShowQuestionForm(true)}
              />
            )}
          </View>

          {/* Add Question Form */}
          {showQuestionForm && (
            <QuestionForm
              onSave={handleAddQuestion}
              onCancel={() => setShowQuestionForm(false)}
            />
          )}

          {/* Edit Question Form */}
          {editingQuestion && (
            <QuestionForm
              initial={editingQuestion}
              onSave={handleUpdateQuestion}
              onCancel={() => setEditingQuestion(null)}
            />
          )}

          {/* Question List */}
          {questions.length === 0 && !showQuestionForm ? (
            <EmptyState
              icon={AlertCircle}
              title="No questions yet"
              message="Add your first question to build this quiz."
            />
          ) : (
            <DraggableQuestionList
              questions={questions}
              onReorder={reorderQuestions}
              onScrollChange={setScrollEnabled}
              renderItem={(question, index) => (
                <QuestionCard
                  question={question}
                  index={index}
                  onEdit={() => {
                    setEditingQuestion(question);
                    setShowQuestionForm(false);
                  }}
                  onDelete={() => handleDeleteQuestion(question.id)}
                />
              )}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
