import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { LeaderboardEntry } from "@/types";

// ---------------------------------------------------------------------------
// useLeaderboard
// ---------------------------------------------------------------------------

export function useLeaderboard(quizId: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(
        "student_id, score, max_score, submitted_at, student:profiles!quiz_attempts_student_id_fkey(full_name)",
      )
      .eq("quiz_id", quizId)
      .eq("status", "graded")
      .order("score", { ascending: false })
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error("[useLeaderboard] fetch error:", error);
      setEntries([]);
    } else {
      const ranked: LeaderboardEntry[] = (data ?? []).map(
        (row: any, index: number) => ({
          student_id: row.student_id,
          student_name: row.student?.full_name ?? "Unknown",
          score: row.score ?? 0,
          max_score: row.max_score ?? 0,
          submitted_at: row.submitted_at,
          rank: index + 1,
        }),
      );
      setEntries(ranked);
    }

    setLoading(false);
  }, [quizId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  }, [fetchLeaderboard]);

  // Initial fetch
  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Supabase Realtime subscription for live leaderboard updates
  useEffect(() => {
    if (!quizId) return;

    const channel = supabase
      .channel(`leaderboard-${quizId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_attempts",
          filter: `quiz_id=eq.${quizId}`,
        },
        () => {
          void fetchLeaderboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [quizId, fetchLeaderboard]);

  return { entries, loading, refreshing, refresh };
}
