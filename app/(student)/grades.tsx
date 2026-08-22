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
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useStudentFinalGrades } from "@/hooks/useGradeEngine";
import type { CategoryBreakdown, FinalGrade } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function letterColor(letter: string): string {
  switch (letter) {
    case "A":
      return colors.success;
    case "B":
      return "#2563eb";
    case "C":
      return colors.warning;
    case "D":
      return "#f97316";
    default:
      return colors.danger;
  }
}

// ---------------------------------------------------------------------------
// Category Breakdown Row
// ---------------------------------------------------------------------------

function CategoryRow({ breakdown }: { breakdown: CategoryBreakdown }) {
  const pctColor =
    breakdown.percentage >= 80
      ? colors.success
      : breakdown.percentage >= 60
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
        <ThemedText variant="small" muted>
          Weight: {breakdown.weight}%
        </ThemedText>
      </View>
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
  const accent = getAccent("student");
  const gradeColor = letterColor(grade.letterGrade);

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
            {grade.categoryBreakdown.length}{" "}
            {grade.categoryBreakdown.length === 1 ? "category" : "categories"}
          </ThemedText>
        </View>
        <ScaleInView>
          <View
            style={{
              backgroundColor: gradeColor + "18",
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              alignItems: "center",
            }}
          >
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

const accent = getAccent("student");

export default function GradesScreen() {
  const router = useRouter();
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
        message="Your weighted grades will appear here once your teacher sets up grade categories and grades your work."
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <ScreenHeader
          title="Grades"
          subtitle={`${finalGrades.length} ${finalGrades.length === 1 ? "class" : "classes"}`}
          onBack={() => router.back()}
        />

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
