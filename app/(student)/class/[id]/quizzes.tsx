import { router, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Clipboard, ClipboardList } from "lucide-react-native";

import {
  Badge,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { modeColor, radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Quiz Card
// ---------------------------------------------------------------------------

function QuizCard({ quiz }: { quiz: QuizWithStudentStatus }) {
  const { colors, accent } = useTheme();
  const isAvailable =
    quiz.studentStatus === "not_started" ||
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
        ) : null}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quizzes Screen
// ---------------------------------------------------------------------------

export default function StudentQuizzesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { classData } = useClass(classId);
  const { quizzes, loading, refreshing, refresh } =
    useStudentQuizStatuses(classId);

  const renderQuiz = ({ item }: { item: QuizWithStudentStatus }) => (
    <QuizCard quiz={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={ClipboardList}
        title="No quizzes yet"
        message="Your teacher hasn't published any quizzes for this class yet."
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <ScreenHeader
          title="Quizzes"
          subtitle={classData?.name}
          onBack={() => router.back()}
        />

        {/* Quiz list */}
        {loading && quizzes.length === 0 ? (
          <FadeInView>
            <View style={{ gap: spacing.md }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </FadeInView>
        ) : (
          <FlatList
            data={quizzes}
            keyExtractor={(item) => item.id}
            key={isTablet ? "grid" : "list"}
            numColumns={isTablet ? 2 : undefined}
            renderItem={renderQuiz}
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
