import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  CategoryBreakdown,
  FinalGrade,
  GradeCategory,
  GradeEntry,
  GradedItem,
} from "@/types";

// ---------------------------------------------------------------------------
// useGradeCategories — fetch/save grade categories for a class
// ---------------------------------------------------------------------------

export function useGradeCategories(classId: string) {
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("grade_categories")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[useGradeCategories] fetch error:", error);
      setCategories([]);
    } else {
      setCategories((data ?? []) as GradeCategory[]);
    }

    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refresh: fetchCategories };
}

// ---------------------------------------------------------------------------
// useSaveGradeCategories — upsert categories (organizational metadata)
// ---------------------------------------------------------------------------

export function useSaveGradeCategories(classId: string) {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (
      items: { id?: string; name: string }[],
    ): Promise<{ success: boolean; error?: string }> => {
      if (!classId) return { success: false, error: "No class ID" };

      // NOTE: Categories are organizational metadata only. Their existence (and
      // any stored `weight` value) NEVER affects final grades, which are
      // points-based. So we no longer validate that weights sum to 100.

      setSaving(true);

      // Delete categories not in the new list
      const newIds = items.filter((i) => i.id).map((i) => i.id as string);
      const { data: existing } = await supabase
        .from("grade_categories")
        .select("id")
        .eq("class_id", classId);

      const existingIds = (existing ?? []).map((r: any) => r.id);
      const toDelete = existingIds.filter((id) => !newIds.includes(id));

      if (toDelete.length > 0) {
        const { error: delError } = await supabase
          .from("grade_categories")
          .delete()
          .in("id", toDelete);

        if (delError) {
          console.error("[useSaveGradeCategories] delete error:", delError);
          setSaving(false);
          return { success: false, error: delError.message };
        }
      }

      // Upsert each category
      for (const item of items) {
        if (item.id) {
          const { error: updError } = await supabase
            .from("grade_categories")
            .update({ name: item.name })
            .eq("id", item.id);

          if (updError) {
            console.error("[useSaveGradeCategories] update error:", updError);
            setSaving(false);
            return { success: false, error: updError.message };
          }
        } else {
          const { error: insError } = await supabase
            .from("grade_categories")
            .insert({
              class_id: classId,
              name: item.name,
            });

          if (insError) {
            console.error("[useSaveGradeCategories] insert error:", insError);
            setSaving(false);
            return { success: false, error: insError.message };
          }
        }
      }

      setSaving(false);
      return { success: true };
    },
    [classId],
  );

  return { save, saving };
}

// ---------------------------------------------------------------------------
// useGradedItems — fetch all graded items for a class
// ---------------------------------------------------------------------------

export function useGradedItems(classId: string) {
  const [items, setItems] = useState<GradedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("graded_items")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[useGradedItems] fetch error:", error);
      setItems([]);
    } else {
      setItems((data ?? []) as GradedItem[]);
    }

    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return { items, loading, refresh: fetchItems };
}

// ---------------------------------------------------------------------------
// useGrades — fetch all grade entries for a class
// ---------------------------------------------------------------------------

export function useGrades(classId: string) {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrades = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    // Fetch grades via graded_items for this class
    const { data: items } = await supabase
      .from("graded_items")
      .select("id")
      .eq("class_id", classId);

    const itemIds = (items ?? []).map((i: any) => i.id);

    if (itemIds.length === 0) {
      setGrades([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("grades")
      .select("*")
      .in("graded_item_id", itemIds);

    if (error) {
      console.error("[useGrades] fetch error:", error);
      setGrades([]);
    } else {
      setGrades((data ?? []) as GradeEntry[]);
    }

    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades]);

  return { grades, loading, refresh: fetchGrades };
}

// ---------------------------------------------------------------------------
// useUpsertGrade — upsert a manual grade entry
// ---------------------------------------------------------------------------

export function useUpsertGrade() {
  const [saving, setSaving] = useState(false);

  const upsert = useCallback(
    async (
      gradedItemId: string,
      studentId: string,
      score: number,
    ): Promise<{ success: boolean; error?: string }> => {
      setSaving(true);

      const { error } = await supabase.rpc("upsert_grade", {
        p_graded_item_id: gradedItemId,
        p_student_id: studentId,
        p_score: score,
      });

      if (error) {
        console.error("[useUpsertGrade] error:", error);
        setSaving(false);
        return { success: false, error: error.message };
      }

      setSaving(false);
      return { success: true };
    },
    [],
  );

  return { upsert, saving };
}

// ---------------------------------------------------------------------------
// useFinalGrades — fetch final grades for a class via RPC
// ---------------------------------------------------------------------------

export function useFinalGrades(classId: string) {
  const [finalGrades, setFinalGrades] = useState<FinalGrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinalGrades = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    const { data, error } = await supabase.rpc("final_grades", {
      p_class_id: classId,
    });

    if (error) {
      console.error("[useFinalGrades] RPC error:", error);
      setFinalGrades([]);
    } else {
      const mapped: FinalGrade[] = (data ?? []).map((row: any) => ({
        studentId: row.student_id,
        studentName: row.student_name,
        categoryBreakdown: (row.category_breakdown ??
          []) as CategoryBreakdown[],
        pointsEarned: row.points_earned ?? 0,
        pointsPossible: row.points_possible ?? 0,
        finalPercentage: row.final_percentage,
        letterGrade: row.letter_grade,
      }));
      setFinalGrades(mapped);
    }

    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void fetchFinalGrades();
  }, [fetchFinalGrades]);

  return { finalGrades, loading, refresh: fetchFinalGrades };
}

// ---------------------------------------------------------------------------
// useStudentFinalGrades — fetch final grades for the current student across
// all enrolled classes
// ---------------------------------------------------------------------------

export function useStudentFinalGrades() {
  const user = useAuthStore((state) => state.user);
  const [finalGrades, setFinalGrades] = useState<
    (FinalGrade & { classId: string; className: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get enrolled class IDs
    const { data: memberships } = await supabase
      .from("class_members")
      .select("class_id, class:classes(name)")
      .eq("student_id", user.id);

    if (!memberships?.length) {
      setFinalGrades([]);
      setLoading(false);
      return;
    }

    const results: (FinalGrade & { classId: string; className: string })[] = [];

    for (const m of memberships) {
      const classId = m.class_id;
      const className = (m as any).class?.name ?? "Unknown Class";

      const { data, error } = await supabase.rpc("student_final_grade", {
        p_class_id: classId,
        p_student_id: user.id,
      });

      if (error) {
        console.error(
          "[useStudentFinalGrades] RPC error for class",
          classId,
          error,
        );
        continue;
      }

      if (data && data.length > 0) {
        const row = data[0] as any;
        results.push({
          studentId: row.student_id,
          studentName: row.student_name,
          categoryBreakdown: (row.category_breakdown ??
            []) as CategoryBreakdown[],
          pointsEarned: row.points_earned ?? 0,
          pointsPossible: row.points_possible ?? 0,
          finalPercentage: row.final_percentage,
          letterGrade: row.letter_grade,
          classId,
          className,
        });
      }
    }

    setFinalGrades(results);
    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { finalGrades, loading, refreshing, refresh };
}

// ---------------------------------------------------------------------------
// useCreateManualGradedItem — create a manual graded item
// ---------------------------------------------------------------------------

export function useCreateManualGradedItem() {
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (params: {
      classId: string;
      categoryId: string;
      title: string;
      maxScore: number;
    }): Promise<{ success: boolean; error?: string; id?: string }> => {
      setCreating(true);

      const { data, error } = await supabase
        .from("graded_items")
        .insert({
          class_id: params.classId,
          category_id: params.categoryId,
          source_type: "manual",
          title: params.title,
          max_score: params.maxScore,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[useCreateManualGradedItem] error:", error);
        setCreating(false);
        return { success: false, error: error.message };
      }

      setCreating(false);
      return { success: true, id: data.id };
    },
    [],
  );

  return { create, creating };
}

// ---------------------------------------------------------------------------
// useDeleteGradedItem — delete a graded item (manual only)
// ---------------------------------------------------------------------------

export function useDeleteGradedItem() {
  const [deleting, setDeleting] = useState(false);

  const remove = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      setDeleting(true);

      const { error } = await supabase
        .from("graded_items")
        .delete()
        .eq("id", itemId)
        .eq("source_type", "manual"); // safety: only allow deleting manual items

      if (error) {
        console.error("[useDeleteGradedItem] error:", error);
        setDeleting(false);
        return { success: false, error: error.message };
      }

      setDeleting(false);
      return { success: true };
    },
    [],
  );

  return { remove, deleting };
}
