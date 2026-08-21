import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useClass } from "@/hooks/useClasses";
import { supabase } from "@/lib/supabase";
import type { Grade, Quiz } from "@/types";

// ---------------------------------------------------------------------------
// Types for the gradebook matrix
// ---------------------------------------------------------------------------

type StudentRow = {
  studentId: string;
  studentName: string;
};

type GradebookEntry = {
  studentId: string;
  quizId: string;
  score: number;
  maxScore: number;
};

// ---------------------------------------------------------------------------
// Gradebook Screen
// ---------------------------------------------------------------------------

export default function GradebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const accent = getAccent("teacher");
  const { classData } = useClass(classId);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch students (class members with profiles)
      const { data: members } = await supabase
        .from("class_members")
        .select(
          "student_id, student:profiles!class_members_student_id_fkey(full_name)",
        )
        .eq("class_id", classId);

      const studentRows: StudentRow[] = (members ?? []).map((m: any) => ({
        studentId: m.student_id,
        studentName: m.student?.full_name ?? "Unknown",
      }));

      // Fetch quizzes
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: true });

      const quizList: Quiz[] = (quizData ?? []) as Quiz[];

      // Fetch grades for these quizzes
      const quizIds = quizList.map((q) => q.id);
      let gradeList: Grade[] = [];

      if (quizIds.length > 0) {
        const { data: gradeData } = await supabase
          .from("grades")
          .select("*")
          .in("quiz_id", quizIds);

        gradeList = (gradeData ?? []) as Grade[];
      }

      setStudents(studentRows);
      setQuizzes(quizList);
      setGrades(gradeList);
      setLoading(false);
    };

    void fetchData();
  }, [classId]);

  // Build a lookup: `${studentId}::${quizId}` → Grade
  const gradeMap = new Map<string, Grade>();
  for (const g of grades) {
    gradeMap.set(`${g.student_id}::${g.quiz_id}`, g);
  }

  const COL_WIDTH = 100;
  const NAME_COL_WIDTH = 140;

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
              Gradebook
            </ThemedText>
            {classData && (
              <ThemedText variant="small" muted>
                {classData.name}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Summary */}
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: accent.accentSoft,
              borderRadius: radii.md,
              padding: spacing.md,
              alignItems: "center",
            }}
          >
            <ThemedText variant="display" style={{ color: accent.accentText }}>
              {students.length}
            </ThemedText>
            <ThemedText variant="small" style={{ color: accent.accentText }}>
              Students
            </ThemedText>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: accent.accentSoft,
              borderRadius: radii.md,
              padding: spacing.md,
              alignItems: "center",
            }}
          >
            <ThemedText variant="display" style={{ color: accent.accentText }}>
              {quizzes.length}
            </ThemedText>
            <ThemedText variant="small" style={{ color: accent.accentText }}>
              Quizzes
            </ThemedText>
          </View>
        </View>

        {/* Gradebook table */}
        {students.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ThemedText muted>No students enrolled yet.</ThemedText>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Table header */}
              <View
                style={{
                  flexDirection: "row",
                  borderBottomWidth: 2,
                  borderBottomColor: colors.border,
                  paddingBottom: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: NAME_COL_WIDTH,
                    paddingHorizontal: spacing.sm,
                  }}
                >
                  <ThemedText variant="small" style={{ fontWeight: "600" }}>
                    Student
                  </ThemedText>
                </View>
                {quizzes.map((quiz) => (
                  <View
                    key={quiz.id}
                    style={{
                      width: COL_WIDTH,
                      paddingHorizontal: spacing.sm,
                      alignItems: "center",
                    }}
                  >
                    <ThemedText
                      variant="small"
                      style={{ fontWeight: "600" }}
                      numberOfLines={2}
                    >
                      {quiz.title}
                    </ThemedText>
                    <ThemedText variant="small" muted>
                      {quiz.status === "draft" ? "Draft" : ""}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Table body */}
              <ScrollView showsVerticalScrollIndicator>
                {students.map((student) => (
                  <View
                    key={student.studentId}
                    style={{
                      flexDirection: "row",
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: NAME_COL_WIDTH,
                        paddingHorizontal: spacing.sm,
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText variant="caption" numberOfLines={1}>
                        {student.studentName}
                      </ThemedText>
                    </View>
                    {quizzes.map((quiz) => {
                      const key = `${student.studentId}::${quiz.id}`;
                      const grade = gradeMap.get(key);

                      return (
                        <View
                          key={quiz.id}
                          style={{
                            width: COL_WIDTH,
                            paddingHorizontal: spacing.sm,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {grade ? (
                            <View style={{ alignItems: "center" }}>
                              <ThemedText
                                variant="body"
                                style={{ fontWeight: "600" }}
                              >
                                {grade.score}/{grade.max_score}
                              </ThemedText>
                              {grade.graded_at ? (
                                <ThemedText variant="small" muted>
                                  Graded
                                </ThemedText>
                              ) : (
                                <ThemedText
                                  variant="small"
                                  style={{ color: colors.warning }}
                                >
                                  Pending
                                </ThemedText>
                              )}
                            </View>
                          ) : (
                            <ThemedText variant="body" muted>
                              —
                            </ThemedText>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
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
                - Auto-grade quiz submissions
                - Calculate weighted totals and class averages
                - Export grades to CSV/PDF
                - Tap a cell to edit/view detailed grade breakdown */}
            Grade engine & editing coming in Part 6
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}
