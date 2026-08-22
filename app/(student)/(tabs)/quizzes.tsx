import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { ClipboardList } from "lucide-react-native";

import {
  AnimatedListItem,
  Badge,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useStudentAllQuizzes } from "@/hooks/useClasses";
import type { QuizWithStudentStatusAndClass, StudentQuizStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<StudentQuizStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  graded: "Graded",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Quiz Card
// ---------------------------------------------------------------------------

function QuizCard({ quiz }: { quiz: QuizWithStudentStatusAndClass }) {
  const { colors, accent } = useTheme();
  const router = useRouter();
  const isOverdue =
    quiz.due_at !== null && new Date(quiz.due_at) < new Date();
  const isAvailable =
    (quiz.studentStatus === "not_started" && !isOverdue) ||
    quiz.studentStatus === "in_progress";

  const statusTone = quiz.studentStatus === "graded" ? "success" : quiz.studentStatus === "submitted" ? "warning" : quiz.studentStatus === "in_progress" ? "accent" : "neutral";

  return (
    <Card
      onPress={() => {
        if (!isAvailable) return;
        router.push(
          `/(student)/class/${quiz.class_id}/quizzes/${quiz.id}/take` as any,
        );
      }}
      style={{ opacity: isAvailable ? 1 : 0.7 }}
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
        <Badge
          label={STATUS_LABELS[quiz.studentStatus]}
          tone={statusTone}
          size="sm"
        />
      </View>

      {/* Score display for graded/submitted */}
      {quiz.score !== null && quiz.maxScore !== null && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.sm,
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
          {quiz.studentStatus === "graded" && quiz.maxScore > 0 && (
            <ThemedText
              variant="small"
              style={{
                fontWeight: "600",
                color:
                  (quiz.score / quiz.maxScore) >= 0.6
                    ? colors.success
                    : colors.danger,
              }}
            >
              {Math.round((quiz.score / quiz.maxScore) * 100)}%
            </ThemedText>
          )}
        </View>
      )}

      {/* Class name badge + due date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.sm,
        }}
      >
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
            {quiz.class_name}
          </ThemedText>
        </View>
        {quiz.due_at && (
          <ThemedText variant="small" muted>
            Due {formatDate(quiz.due_at)}
            {isOverdue ? " (Past Due)" : ""}
          </ThemedText>
        )}
      </View>

      {/* Action button */}
      {isAvailable ? (
        <View style={{ marginTop: spacing.sm, alignItems: "flex-end" }}>
          <Pressable
            onPress={() =>
              router.push(
                `/(student)/class/${quiz.class_id}/quizzes/${quiz.id}/take` as any,
              )
            }
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
          </Pressable>
        </View>
      ) : isOverdue && quiz.studentStatus === "not_started" ? (
        <View style={{ marginTop: spacing.sm, alignItems: "flex-end" }}>
          <ThemedText variant="small" style={{ color: colors.danger }}>
            Past Due
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Student All Quizzes Screen
// ---------------------------------------------------------------------------

export default function StudentAllQuizzesScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const router = useRouter();
  const { quizzes, loading, refreshing, refresh } = useStudentAllQuizzes();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderQuiz = ({ item }: { item: QuizWithStudentStatusAndClass }) => (
    <QuizCard quiz={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={ClipboardList}
        title="No quizzes yet"
        message="Published quizzes from your classes will appear here."
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <ThemedText variant="display">All Quizzes</ThemedText>
          <ThemedText muted>
            {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} available
          </ThemedText>
        </View>

        {/* Quiz list */}
        {loading && quizzes.length === 0 ? (
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
                <SkeletonCard />
                <SkeletonCard />
              </View>
            </FadeInView>
          </View>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(item) => item.id}
            key={isTablet ? "grid" : "list"}
            numColumns={isTablet ? 2 : undefined}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                {renderQuiz({ item })}
              </AnimatedListItem>
            )}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            columnWrapperStyle={isTablet ? { gap: spacing.md } : undefined}
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
