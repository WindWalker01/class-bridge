import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  View,
} from "react-native";

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
import { ClipboardList } from "lucide-react-native";
import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useTeacherAllQuizzes } from "@/hooks/useClasses";
import { Routes } from "@/lib/navigation";
import type { QuizWithClass, QuizStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TO_TONE: Record<QuizStatus, "neutral" | "success" | "danger"> = {
  draft: "neutral",
  published: "success",
  closed: "danger",
};

const STATUS_LABELS: Record<QuizStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Quiz Card
// ---------------------------------------------------------------------------

function QuizCard({ quiz }: { quiz: QuizWithClass }) {
  const { colors, accent } = useTheme();

  return (
    <Card
      variant="elevated"
      onPress={() => {
        router.push(
          `/(teacher)/class/${quiz.class_id}/quizzes/${quiz.id}/edit` as any,
        );
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
          <ThemedText variant="heading" numberOfLines={1}>
            {quiz.title}
          </ThemedText>
          {quiz.description ? (
            <ThemedText variant="caption" muted numberOfLines={2}>
              {quiz.description}
            </ThemedText>
          ) : null}
        </View>
        <Badge
          label={STATUS_LABELS[quiz.status]}
          tone={STATUS_TO_TONE[quiz.status]}
          size="sm"
        />
      </View>

      {/* Class name badge */}
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
        <ThemedText variant="small" muted>
          Created {formatDate(quiz.created_at)}
        </ThemedText>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Teacher All Quizzes Screen
// ---------------------------------------------------------------------------

export default function TeacherAllQuizzesScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { quizzes, loading, refreshing, refresh } = useTeacherAllQuizzes();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderQuiz = ({ item }: { item: QuizWithClass }) => (
    <QuizCard quiz={item} />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={ClipboardList}
        title="No quizzes yet"
        message="Quizzes from all your classes will appear here once you create them."
        actionLabel="Create Class"
        onAction={() => router.push(Routes.createClass)}
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
            {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} across{" "}
            {new Set(quizzes.map((q) => q.class_name)).size}{" "}
            {new Set(quizzes.map((q) => q.class_name)).size === 1
              ? "class"
              : "classes"}
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
