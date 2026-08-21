import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthStore } from "@/store/useAuthStore";
import type { LeaderboardEntry } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const accent = getAccent("student");

const MEDAL_COLORS: Record<number, string> = {
  1: "#fbbf24", // gold
  2: "#94a3b8", // silver
  3: "#d97706", // bronze
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Leaderboard Entry Card
// ---------------------------------------------------------------------------

function LeaderboardCard({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medalColor = MEDAL_COLORS[entry.rank];

  return (
    <View
      style={{
        backgroundColor: isCurrentUser ? accent.accentSoft : colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: isCurrentUser ? accent.accent : colors.border,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      {/* Rank */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: medalColor ? medalColor + "20" : colors.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {entry.rank <= 3 ? (
          <ThemedText style={{ fontSize: 20 }}>
            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
          </ThemedText>
        ) : (
          <ThemedText
            variant="body"
            style={{ fontWeight: "600", color: colors.textMuted }}
          >
            {entry.rank}
          </ThemedText>
        )}
      </View>

      {/* Student info */}
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText
          variant="body"
          style={{ fontWeight: isCurrentUser ? "700" : "500" }}
        >
          {entry.student_name}
          {isCurrentUser ? " (You)" : ""}
        </ThemedText>
        <ThemedText variant="small" muted>
          Submitted {formatDate(entry.submitted_at)}
        </ThemedText>
      </View>

      {/* Score */}
      <View style={{ alignItems: "flex-end" }}>
        <ThemedText
          variant="heading"
          style={{
            color: isCurrentUser ? accent.accentText : colors.text,
          }}
        >
          {entry.score}
        </ThemedText>
        <ThemedText variant="small" muted>
          / {entry.max_score}
        </ThemedText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard Screen
// ---------------------------------------------------------------------------

export default function LeaderboardScreen() {
  const { id, quizId } = useLocalSearchParams<{ id: string; quizId: string }>();
  const classId = id ?? "";
  const user = useAuthStore((state) => state.user);
  const { entries, loading, refreshing, refresh } = useLeaderboard(
    quizId ?? "",
  );

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => (
    <LeaderboardCard
      entry={item}
      isCurrentUser={item.student_id === user?.id}
    />
  );

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
          No submissions yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Be the first to submit and appear on the leaderboard!
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
            <ThemedText variant="heading" numberOfLines={1}>
              Leaderboard
            </ThemedText>
            <ThemedText variant="small" muted>
              {entries.length} submission{entries.length !== 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>

        {/* Live indicator */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
            backgroundColor: "#dcfce7",
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            alignSelf: "flex-start",
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
            }}
          />
          <ThemedText
            variant="small"
            style={{ color: colors.success, fontWeight: "600" }}
          >
            Live
          </ThemedText>
        </View>

        {/* Leaderboard list */}
        {loading && entries.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.student_id}
            renderItem={renderEntry}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.sm,
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

        {/* Back to quizzes button */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingVertical: spacing.md,
          }}
        >
          <Pressable
            onPress={() =>
              router.replace(`/(student)/class/${classId}/quizzes` as any)
            }
            style={{
              backgroundColor: accent.accentSoft,
              borderRadius: radii.md,
              padding: spacing.md,
              alignItems: "center",
            }}
          >
            <ThemedText
              variant="body"
              style={{ color: accent.accentText, fontWeight: "600" }}
            >
              Back to Quizzes
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
