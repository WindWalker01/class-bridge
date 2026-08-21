import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useStudentAllGrades } from "@/hooks/useClasses";
import type { StudentGradeItem } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group grade items by classId, preserving insertion order. */
function groupByClass(
  items: StudentGradeItem[],
): { classId: string; className: string; items: StudentGradeItem[] }[] {
  const map = new Map<
    string,
    { classId: string; className: string; items: StudentGradeItem[] }
  >();
  for (const item of items) {
    const existing = map.get(item.classId);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(item.classId, {
        classId: item.classId,
        className: item.className,
        items: [item],
      });
    }
  }
  return Array.from(map.values());
}

/** Calculate overall percentage for a list of grade items. */
function overallPercent(items: StudentGradeItem[]): number {
  const totalScore = items.reduce((sum, i) => sum + i.score, 0);
  const totalMax = items.reduce((sum, i) => sum + i.maxScore, 0);
  if (totalMax === 0) return 0;
  return Math.round((totalScore / totalMax) * 100);
}

// ---------------------------------------------------------------------------
// Grade Item Row
// ---------------------------------------------------------------------------

function GradeItemRow({ item }: { item: StudentGradeItem }) {
  const percent =
    item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
  const percentColor =
    percent >= 80
      ? colors.success
      : percent >= 60
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
          {item.itemName}
        </ThemedText>
      </View>
      <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
        <ThemedText variant="caption" style={{ fontWeight: "600" }}>
          {item.score}/{item.maxScore}
        </ThemedText>
        <ThemedText
          variant="small"
          style={{ color: percentColor, fontWeight: "600" }}
        >
          {percent}%
        </ThemedText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Class Grade Section
// ---------------------------------------------------------------------------

function ClassGradeSection({
  section,
}: {
  section: {
    classId: string;
    className: string;
    items: StudentGradeItem[];
  };
}) {
  const percent = overallPercent(section.items);

  return (
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
            {section.className}
          </ThemedText>
          <ThemedText variant="small" muted>
            {section.items.length}{" "}
            {section.items.length === 1 ? "item" : "items"}
          </ThemedText>
        </View>
        <View
          style={{
            backgroundColor: accent.accentSoft,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            alignItems: "center",
          }}
        >
          <ThemedText
            variant="title"
            style={{ color: accent.accentText, fontWeight: "700" }}
          >
            {percent}%
          </ThemedText>
          <ThemedText variant="small" style={{ color: accent.accentText }}>
            Overall
          </ThemedText>
        </View>
      </View>

      {/* Items */}
      <View>
        {section.items.map((item) => (
          <GradeItemRow key={item.itemId} item={item} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grades Screen
// ---------------------------------------------------------------------------

const accent = getAccent("student");

export default function GradesScreen() {
  const router = useRouter();
  const { gradeItems, loading, refreshing, refresh } = useStudentAllGrades();

  const sections = useMemo(() => groupByClass(gradeItems), [gradeItems]);

  const renderSection = ({
    item,
  }: {
    item: {
      classId: string;
      className: string;
      items: StudentGradeItem[];
    };
  }) => <ClassGradeSection section={item} />;

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
          No grades yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Your grades will appear here once your teacher grades your submitted
          work.
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
            <ThemedText variant="display">Grades</ThemedText>
            <ThemedText muted>
              {gradeItems.length} {gradeItems.length === 1 ? "grade" : "grades"}{" "}
              across {sections.length}{" "}
              {sections.length === 1 ? "class" : "classes"}
            </ThemedText>
          </View>
        </View>

        {/* Grade sections */}
        {loading && gradeItems.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={sections}
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

        {/* TODO: Part 6 — Grade Engine integration */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <ThemedText variant="small" muted style={{ textAlign: "center" }}>
            {/* TODO: Connect to Grade Engine (Part 6).
                - Weighted grade calculations
                - Category breakdowns (homework, quizzes, exams)
                - Detailed grade history and trends */}
            Advanced grade features coming in Part 6 — Grade Engine
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}
