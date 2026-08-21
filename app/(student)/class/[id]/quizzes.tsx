import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useClass, useStudentQuizStatuses } from "@/hooks/useClasses";
import type { QuizWithStudentStatus, StudentQuizStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<StudentQuizStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  graded: "Graded",
};

const STATUS_COLORS: Record<StudentQuizStatus, string> = {
  not_started: "#94a3b8",
  in_progress: "#2563eb",
  submitted: "#d97706",
  graded: "#16a34a",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

const accent = getAccent("student");

// ---------------------------------------------------------------------------
// Quiz Card
// ---------------------------------------------------------------------------

function QuizCard({ quiz }: { quiz: QuizWithStudentStatus }) {
  const statusColor = STATUS_COLORS[quiz.studentStatus];
  const isAvailable =
    quiz.studentStatus === "not_started" ||
    quiz.studentStatus === "in_progress";

  return (
    <Pressable
      onPress={() => {
        if (!isAvailable) return;
        router.push(
          `/(student)/class/${quiz.class_id}/quizzes/${quiz.id}/take` as any,
        );
      }}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
        opacity: isAvailable ? 1 : 0.7,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="heading">{quiz.title}</ThemedText>
          {quiz.description ? (
            <ThemedText variant="caption" muted numberOfLines={2}>
              {quiz.description}
            </ThemedText>
          ) : null}
        </View>
        <View
          style={{
            backgroundColor: statusColor + "18",
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          <ThemedText
            variant="small"
            style={{
              color: statusColor,
              fontWeight: "600",
            }}
          >
            {STATUS_LABELS[quiz.studentStatus]}
          </ThemedText>
        </View>
      </View>

      {/* Score display for graded/submitted */}
      {quiz.score !== null && quiz.maxScore !== null && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <ThemedText variant="small" style={{ fontWeight: "600" }}>
              {quiz.score}/{quiz.maxScore}
            </ThemedText>
          </View>
          {quiz.studentStatus === "graded" && (
            <ThemedText variant="small" style={{ color: colors.success }}>
              ✓ Graded
            </ThemedText>
          )}
        </View>
      )}

      {/* Action hint */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ThemedText variant="small" muted>
          Created {formatDate(quiz.created_at)}
        </ThemedText>
        {isAvailable ? (
          <View
            style={{
              backgroundColor: accent.accentSoft,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <ThemedText
              variant="small"
              style={{ color: accent.accentText, fontWeight: "600" }}
            >
              {quiz.studentStatus === "in_progress" ? "Continue" : "Start Quiz"}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Quizzes Screen
// ---------------------------------------------------------------------------

export default function StudentQuizzesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { classData } = useClass(classId);
  const { quizzes, loading, refreshing, refresh } =
    useStudentQuizStatuses(classId);

  const renderQuiz = ({ item }: { item: QuizWithStudentStatus }) => (
    <QuizCard quiz={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: spacing.xxl,
        }}
      >
        <ThemedText
          variant="heading"
          muted
          style={{ marginBottom: spacing.sm }}
        >
          No quizzes yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Your teacher hasn't published any quizzes for this class yet.
        </ThemedText>
      </View>
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading" numberOfLines={1}>
              Quizzes
            </ThemedText>
            {classData && (
              <ThemedText variant="small" muted>
                {classData.name}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Quiz list */}
        {loading && quizzes.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(item) => item.id}
            renderItem={renderQuiz}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={accent.accent}
                colors={[accent.accent]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}
