import { router, useLocalSearchParams } from "expo-router";
import { File, FileText } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
  useToast,
} from "@/components";
import {
  colors,
  getAccent,
  radii,
  spacing,
  typography,
} from "@/constants/theme";
import { useClass } from "@/hooks/useClasses";
import {
  useCreateManualGradedItem,
  useDeleteGradedItem,
  useFinalGrades,
  useGradeCategories,
  useGradedItems,
  useGrades,
  useUpsertGrade,
} from "@/hooks/useGradeEngine";
import {
  exportGradebook,
  type GradeColumnType,
  type GradeExportData,
  type GradeExportFormatChoice,
} from "@/lib/gradeExport";
import { supabase } from "@/lib/supabase";
import type { FinalGrade, GradeEntry, GradedItem } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StudentRow = {
  studentId: string;
  studentName: string;
};

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
// Gradebook Screen
// ---------------------------------------------------------------------------

export default function GradebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const accent = getAccent("teacher");
  const { classData } = useClass(classId);
  const insets = useSafeAreaInsets();

  // Data hooks
  const { categories } = useGradeCategories(classId);
  const {
    items: gradedItems,
    loading: itemsLoading,
    refresh: refreshItems,
  } = useGradedItems(classId);
  const {
    grades,
    loading: gradesLoading,
    refresh: refreshGrades,
  } = useGrades(classId);
  const {
    finalGrades,
    loading: finalsLoading,
    refresh: refreshFinals,
  } = useFinalGrades(classId);
  const { upsert, saving: upserting } = useUpsertGrade();
  const { create: createItem, creating } = useCreateManualGradedItem();
  const { remove: deleteItem, deleting } = useDeleteGradedItem();
  const toast = useToast();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // New manual item form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemMaxScore, setNewItemMaxScore] = useState("100");
  const [newItemCategoryId, setNewItemCategoryId] = useState("");

  // Fetch students
  useEffect(() => {
    if (!classId) return;

    const fetchStudents = async () => {
      setStudentsLoading(true);
      const { data: members } = await supabase
        .from("class_members")
        .select(
          "student_id, student:profiles!class_members_student_id_fkey(full_name)",
        )
        .eq("class_id", classId);

      const rows: StudentRow[] = (members ?? []).map((m: any) => ({
        studentId: m.student_id,
        studentName: m.student?.full_name ?? "Unknown",
      }));

      setStudents(rows);
      setStudentsLoading(false);
    };

    void fetchStudents();
  }, [classId]);

  // Set default category for new manual items
  useEffect(() => {
    if (categories.length > 0 && !newItemCategoryId) {
      setNewItemCategoryId(categories[0].id);
    }
  }, [categories, newItemCategoryId]);

  // Supabase Realtime: subscribe to grades changes
  useEffect(() => {
    if (!classId) return;

    const channel = supabase
      .channel(`grades-${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grades",
        },
        () => {
          void refreshGrades();
          void refreshFinals();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [classId, refreshGrades, refreshFinals]);

  // Build grade lookup: `${gradedItemId}::${studentId}` → GradeEntry
  const gradeMap = useMemo(() => {
    const map = new Map<string, GradeEntry>();
    for (const g of grades) {
      map.set(`${g.graded_item_id}::${g.student_id}`, g);
    }
    return map;
  }, [grades]);

  // Build final grade lookup: studentId → FinalGrade
  const finalMap = useMemo(() => {
    const map = new Map<string, FinalGrade>();
    for (const f of finalGrades) {
      map.set(f.studentId, f);
    }
    return map;
  }, [finalGrades]);

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<GradeExportFormatChoice | null>(
    null,
  );

  // Category columns = union of category names across all students' finals,
  // preserving first-seen order.
  const categoryNames = useMemo(() => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const f of finalGrades) {
      for (const c of f.categoryBreakdown ?? []) {
        if (!seen.has(c.categoryName)) {
          seen.add(c.categoryName);
          names.push(c.categoryName);
        }
      }
    }
    return names;
  }, [finalGrades]);

  const exportData: GradeExportData = useMemo(() => {
    const headers = [
      "Student",
      ...gradedItems.map((i) => i.title),
      ...categoryNames,
      "Final",
      "Letter",
    ];
    const columnTypes: GradeColumnType[] = [
      "student",
      ...gradedItems.map(() => "score" as const),
      ...categoryNames.map(() => "category" as const),
      "final" as const,
      "letter" as const,
    ];
    const rows = students.map((student) => {
      const final = finalMap.get(student.studentId);
      const itemCells = gradedItems.map((item) => {
        const g = gradeMap.get(`${item.id}::${student.studentId}`);
        return g ? `${g.score}/${item.max_score}` : null;
      });
      const catCells = categoryNames.map(
        (name) =>
          final?.categoryBreakdown?.find((c) => c.categoryName === name)
            ?.percentage ?? null,
      );
      return [
        student.studentName,
        ...itemCells,
        ...catCells,
        final ? final.finalPercentage : null,
        final ? final.letterGrade : null,
      ] as (string | number | null)[];
    });

    return {
      className: classData?.name ?? "Class",
      generatedAt: new Date().toLocaleString(),
      headers,
      columnTypes,
      rows,
    };
  }, [
    students,
    gradedItems,
    gradeMap,
    finalMap,
    categoryNames,
    classData?.name,
  ]);

  const handleExport = async (format: GradeExportFormatChoice) => {
    setShowExport(false);
    setExporting(format);
    try {
      const fileName = await exportGradebook(format, exportData);
      toast.show(`Exported ${fileName}`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Export failed. Please try again.";
      toast.show(message, { type: "error" });
    } finally {
      setExporting(null);
    }
  };

  const handleScoreChange = useCallback(
    async (gradedItemId: string, studentId: string, value: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return;

      const result = await upsert(gradedItemId, studentId, num);
      if (result.success) {
        void refreshGrades();
        void refreshFinals();
        toast.show("Grade saved");
      } else {
        toast.show(result.error ?? "Failed to save grade.", { type: "error" });
      }
    },
    [upsert, refreshGrades, refreshFinals],
  );

  const handleAddManualItem = async () => {
    if (!newItemTitle.trim()) {
      Alert.alert("Validation", "Please enter a title.");
      return;
    }
    if (!newItemCategoryId) {
      Alert.alert("Validation", "Please select a category.");
      return;
    }

    const result = await createItem({
      classId,
      categoryId: newItemCategoryId,
      title: newItemTitle.trim(),
      maxScore: parseFloat(newItemMaxScore) || 100,
    });

    if (result.success) {
      setNewItemTitle("");
      setNewItemMaxScore("100");
      setShowAddItem(false);
      void refreshItems();
    } else {
      Alert.alert("Error", result.error ?? "Failed to create item.");
    }
  };

  const handleDeleteItem = (item: GradedItem) => {
    if (item.source_type === "quiz") {
      Alert.alert(
        "Cannot Delete",
        "Quiz-sourced items are managed automatically. Unpublish the quiz to remove it.",
      );
      return;
    }

    Alert.alert("Delete Item", `Delete "${item.title}" and all its grades?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteItem(item.id);
          if (result.success) {
            void refreshItems();
            void refreshGrades();
            void refreshFinals();
          } else {
            Alert.alert("Error", result.error ?? "Failed to delete item.");
          }
        },
      },
    ]);
  };

  const COL_WIDTH = 110;
  const NAME_COL_WIDTH = 140;
  const FINAL_COL_WIDTH = 100;

  const loading =
    studentsLoading || itemsLoading || gradesLoading || finalsLoading;

  if (loading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <ScreenHeader
            title="Gradebook"
            subtitle={classData?.name}
            onBack={() => router.back()}
          />

          {/* Settings & Summary */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.md,
            }}
          >
            <ThemedText variant="title">Overview</ThemedText>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => setShowExport(true)}
                disabled={exporting !== null}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.pill,
                  backgroundColor: accent.accentSoft,
                  opacity: exporting !== null ? 0.6 : 1,
                }}
              >
                <File size={14} color={accent.accentText} />
                <ThemedText
                  variant="small"
                  style={{ color: accent.accentText, fontWeight: "600" }}
                >
                  {exporting === null
                    ? "Export"
                    : `Exporting ${exporting.toUpperCase()}…`}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push(
                    `/(teacher)/class/${classId}/grade-settings` as any,
                  )
                }
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.pill,
                  backgroundColor: accent.accentSoft,
                }}
              >
                <ThemedText
                  variant="small"
                  style={{ color: accent.accentText, fontWeight: "600" }}
                >
                  Settings
                </ThemedText>
              </Pressable>
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
              <ThemedText
                variant="display"
                style={{ color: accent.accentText }}
              >
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
              <ThemedText
                variant="display"
                style={{ color: accent.accentText }}
              >
                {gradedItems.length}
              </ThemedText>
              <ThemedText variant="small" style={{ color: accent.accentText }}>
                Items
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
              <ThemedText
                variant="display"
                style={{ color: accent.accentText }}
              >
                {categories.length}
              </ThemedText>
              <ThemedText variant="small" style={{ color: accent.accentText }}>
                Categories
              </ThemedText>
            </View>
          </View>

          {/* Add manual item button */}
          <View style={{ marginBottom: spacing.md }}>
            {!showAddItem ? (
              <Pressable
                onPress={() => setShowAddItem(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                }}
              >
                <ThemedText style={{ color: accent.accent, fontWeight: "600" }}>
                  + Add Manual Item
                </ThemedText>
              </Pressable>
            ) : (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <ThemedText variant="caption" style={{ fontWeight: "600" }}>
                  New Manual Item
                </ThemedText>
                <TextInput
                  placeholder="Item title (e.g. Participation Week 1)"
                  placeholderTextColor={colors.textSubtle}
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    color: colors.text,
                    fontSize: typography.body.fontSize,
                  }}
                />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small" muted>
                      Max Score
                    </ThemedText>
                    <TextInput
                      placeholder="100"
                      placeholderTextColor={colors.textSubtle}
                      value={newItemMaxScore}
                      onChangeText={setNewItemMaxScore}
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radii.sm,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        color: colors.text,
                        fontSize: typography.body.fontSize,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small" muted>
                      Category
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        gap: spacing.xs,
                        paddingVertical: spacing.xs,
                      }}
                    >
                      {categories.map((cat) => (
                        <Pressable
                          key={cat.id}
                          onPress={() => setNewItemCategoryId(cat.id)}
                          style={{
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: radii.pill,
                            backgroundColor:
                              newItemCategoryId === cat.id
                                ? accent.accent
                                : colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor:
                              newItemCategoryId === cat.id
                                ? accent.accent
                                : colors.border,
                          }}
                        >
                          <ThemedText
                            variant="small"
                            style={{
                              color:
                                newItemCategoryId === cat.id
                                  ? "#fff"
                                  : colors.text,
                              fontWeight: "600",
                            }}
                          >
                            {cat.name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Cancel"
                      onPress={() => setShowAddItem(false)}
                      variant="secondary"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={creating ? "Creating..." : "Add Item"}
                      onPress={handleAddManualItem}
                      loading={creating}
                      disabled={creating || !newItemTitle.trim()}
                    />
                  </View>
                </View>
              </View>
            )}
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
                  {gradedItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onLongPress={() => handleDeleteItem(item)}
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
                        {item.title}
                      </ThemedText>
                      <ThemedText variant="small" muted>
                        {item.source_type === "quiz" ? "Quiz" : "Manual"} /{" "}
                        {item.max_score}
                      </ThemedText>
                    </Pressable>
                  ))}
                  {/* Final grade column header */}
                  <View
                    style={{
                      width: FINAL_COL_WIDTH,
                      paddingHorizontal: spacing.sm,
                      alignItems: "center",
                    }}
                  >
                    <ThemedText variant="small" style={{ fontWeight: "600" }}>
                      Final
                    </ThemedText>
                  </View>
                </View>

                {/* Table body */}
                <ScrollView showsVerticalScrollIndicator>
                  {students.map((student) => {
                    const final = finalMap.get(student.studentId);

                    return (
                      <View
                        key={student.studentId}
                        style={{
                          flexDirection: "row",
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                          paddingVertical: spacing.sm,
                        }}
                      >
                        {/* Student name */}
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

                        {/* Grade cells */}
                        {gradedItems.map((item) => {
                          const key = `${item.id}::${student.studentId}`;
                          const grade = gradeMap.get(key);
                          const isQuiz = item.source_type === "quiz";

                          return (
                            <View
                              key={item.id}
                              style={{
                                width: COL_WIDTH,
                                paddingHorizontal: spacing.sm,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isQuiz ? (
                                // Quiz-sourced: read-only
                                <View style={{ alignItems: "center" }}>
                                  {grade ? (
                                    <>
                                      <ThemedText
                                        variant="body"
                                        style={{ fontWeight: "600" }}
                                      >
                                        {grade.score}/{item.max_score}
                                      </ThemedText>
                                      <ThemedText variant="small" muted>
                                        Auto
                                      </ThemedText>
                                    </>
                                  ) : (
                                    <ThemedText variant="body" muted>
                                      —
                                    </ThemedText>
                                  )}
                                </View>
                              ) : (
                                // Manual: editable
                                <TextInput
                                  value={grade ? String(grade.score) : ""}
                                  placeholder="—"
                                  placeholderTextColor={colors.textSubtle}
                                  keyboardType="numeric"
                                  onChangeText={(v) =>
                                    handleScoreChange(
                                      item.id,
                                      student.studentId,
                                      v,
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: radii.sm,
                                    paddingHorizontal: spacing.xs,
                                    paddingVertical: 4,
                                    color: colors.text,
                                    fontSize: typography.caption.fontSize,
                                    textAlign: "center",
                                    backgroundColor: colors.surface,
                                  }}
                                />
                              )}
                            </View>
                          );
                        })}

                        {/* Final grade cell */}
                        <View
                          style={{
                            width: FINAL_COL_WIDTH,
                            paddingHorizontal: spacing.sm,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {final ? (
                            <View style={{ alignItems: "center" }}>
                              <ThemedText
                                variant="body"
                                style={{
                                  fontWeight: "700",
                                  color: letterColor(final.letterGrade),
                                }}
                              >
                                {final.finalPercentage}%
                              </ThemedText>
                              <ThemedText
                                variant="small"
                                style={{
                                  fontWeight: "700",
                                  color: letterColor(final.letterGrade),
                                }}
                              >
                                {final.letterGrade}
                              </ThemedText>
                            </View>
                          ) : (
                            <ThemedText variant="body" muted>
                              —
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Export format picker */}
      <Modal
        visible={showExport}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExport(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowExport(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.sm,
            }}
            onPress={() => {}}
          >
            <ThemedText variant="heading">Export Grades</ThemedText>
            <ThemedText variant="small" muted>
              Choose a file format. The file will be shared so you can save,
              print, or send it.
            </ThemedText>

            {[
              {
                key: "pdf" as const,
                icon: FileText,
                label: "PDF",
                description: "Styled, print-ready report",
              },
              {
                key: "excel" as const,
                icon: FileText,
                label: "Excel (.xlsx)",
                description: "Styled spreadsheet with frozen header",
              },
              {
                key: "csv" as const,
                icon: File,
                label: "CSV",
                description: "Plain text, imports anywhere",
              },
            ].map(({ key, icon: Icon, label, description }) => (
              <Pressable
                key={key}
                onPress={() => handleExport(key)}
                disabled={exporting !== null}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  opacity: exporting !== null ? 0.6 : 1,
                }}
              >
                <Icon size={22} color={accent.accent} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: "600" }}>
                    {label}
                  </ThemedText>
                  <ThemedText variant="small" muted>
                    {description}
                  </ThemedText>
                </View>
                {exporting === key ? (
                  <ThemedText variant="small" muted>
                    Working…
                  </ThemedText>
                ) : null}
              </Pressable>
            ))}

            <Button
              label="Cancel"
              variant="secondary"
              fullWidth
              onPress={() => setShowExport(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
