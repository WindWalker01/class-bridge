import { useRouter } from "expo-router";
import {
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { Clipboard, ClipboardList } from "lucide-react-native";

import {
  Card,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  ScaleInView,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { modeColor, radii, spacing, type ColorTokens } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useStudentFinalGrades } from "@/hooks/useGradeEngine";
import type { CategoryBreakdown, FinalGrade } from "@/types";

// ---------------------------------------------------------------------------
// Category Breakdown Row
// ---------------------------------------------------------------------------

function CategoryRow({ breakdown }: { breakdown: CategoryBreakdown }) {
  const { colors } = useTheme();
  const hasGrades =
    breakdown.maxScore > 0 && breakdown.score !== null &&
    breakdown.percentage !== null;
  const pctColor =
    !hasGrades
      ? colors.textMuted
      : breakdown.percentage! >= 80
        ? colors.success
        : breakdown.percentage! >= 60
          ? colors.warning
          : colors.danger;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText variant="caption" numberOfLines={1}>
          {breakdown.categoryName}
        </ThemedText>
      </View>
      {hasGrades ? (
        <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>
            {breakdown.score}/{breakdown.maxScore}
          </ThemedText>
          <ThemedText
            variant="small"
            style={{ color: pctColor, fontWeight: "600" }}
          >
            {breakdown.percentage}%
          </ThemedText>
        </View>
      ) : (
        <View style={{ alignItems: "flex-end" }}>
          <ThemedText variant="small" muted>
            No graded activities
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Class Grade Section
// ---------------------------------------------------------------------------

function ClassGradeSection({
  grade,
}: {
  grade: FinalGrade & { classId: string; className: string };
}) {
  const { colors, resolvedMode } = useTheme();
  const hasGrade = grade.finalPercentage !== null;
  const gradeColor = letterColor(grade.letterGrade ?? "F", colors, resolvedMode);

  return (
    <Card variant="flat">
      {/* Class header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {grade.className}
          </ThemedText>
          <ThemedText variant="small" muted>
            {hasGrade
              ? `Points: ${grade.pointsEarned} / ${grade.pointsPossible}`
              : "No graded activities yet"}
          </ThemedText>
        </View>
        <ScaleInView>
          <View
            style={{
              backgroundColor: hasGrade ? gradeColor + "18" : colors.surfaceMuted,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              alignItems: "center",
            }}
          >
            {hasGrade ? (
              <>
                <ThemedText
                  variant="title"
                  style={{ color: gradeColor, fontWeight: "700" }}
                >
                  {grade.finalPercentage}%
                </ThemedText>
                <ThemedText
                  variant="display"
                  style={{ color: gradeColor, fontWeight: "800" }}
                >
                  {grade.letterGrade}
                </ThemedText>
              </>
            ) : (
              <ThemedText variant="title" muted>
                No grades yet
              </ThemedText>
            )}
          </View>
        </ScaleInView>
      </View>

      {/* Category breakdowns */}
      <View>
        {grade.categoryBreakdown.map((cat) => (
          <CategoryRow key={cat.categoryName} breakdown={cat} />
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Grades Screen
// ---------------------------------------------------------------------------

export default function GradesScreen() {
  const { accent } = useTheme();
  const { finalGrades, loading, refreshing, refresh } = useStudentFinalGrades();

  const renderSection = ({
    item,
  }: {
    item: FinalGrade & { classId: string; className: string };
  }) => <ClassGradeSection grade={item} />;

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={ClipboardList}
        title="No grades yet"
        message="Your grades will appear here once your teacher grades your quizzes and activities."
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
          <ThemedText variant="display">Grades</ThemedText>
          <ThemedText muted>
            {finalGrades.length} {finalGrades.length === 1 ? "class" : "classes"}
          </ThemedText>
        </View>

        {/* Grade sections */}
        {loading && finalGrades.length === 0 ? (
          <FadeInView>
            <View style={{ gap: spacing.md }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </FadeInView>
        ) : (
          <FlatList
            data={finalGrades}
            keyExtractor={(item) => item.classId}
            renderItem={renderSection}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function letterColor(
  letter: string,
  colors: ColorTokens,
  mode: "light" | "dark",
): string {
  switch (letter) {
    case "A":
      return colors.success;
    case "B":
      return colors.primary;
    case "C":
      return colors.warning;
    case "D":
      return modeColor(mode, "#f97316", "#fb923c");
    default:
      return colors.danger;
  }
}