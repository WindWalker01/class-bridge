import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useClass } from "@/hooks/useClasses";
import { supabase } from "@/lib/supabase";
import type { Quiz, QuizAttempt } from "@/types";

// ---------------------------------------------------------------------------
// Types for the gradebook matrix
// ---------------------------------------------------------------------------

type StudentRow = {
  studentId: string;
  studentName: string;
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
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
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

      // Fetch graded quiz attempts for these quizzes
      const quizIds = quizList.map((q) => q.id);
      let attemptList: QuizAttempt[] = [];

      if (quizIds.length > 0) {
        const { data: attemptData } = await supabase
          .from("quiz_attempts")
          .select("*")
          .in("quiz_id", quizIds)
          .eq("status", "graded");

        attemptList = (attemptData ?? []) as QuizAttempt[];
      }

      setStudents(studentRows);
      setQuizzes(quizList);
      setAttempts(attemptList);
      setLoading(false);
    };

    void fetchData();
  }, [classId]);

  // Build a lookup: `${studentId}::${quizId}` → QuizAttempt
  const attemptMap = new Map<string, QuizAttempt>();
  for (const a of attempts) {
    attemptMap.set(`${a.student_id}::${a.quiz_id}`, a);
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
                      const attempt = attemptMap.get(key);

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
                          {attempt ? (
                            <View style={{ alignItems: "center" }}>
                              <ThemedText
                                variant="body"
                                style={{ fontWeight: "600" }}
                              >
                                {attempt.score}/{attempt.max_score}
                              </ThemedText>
                              <ThemedText variant="small" muted>
                                Graded
                              </ThemedText>
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
      </View>
    </Screen>
  );
}
