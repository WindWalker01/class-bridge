import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  Layout,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

import {
  AnimatedListItem,
  AnimatedScore,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  ScreenHeader,
  SkeletonRow,
  ThemedText,
} from "@/components";
import { modeColor, radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthStore } from "@/store/useAuthStore";
import type { LeaderboardEntry } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDAL_COLORS: Record<number, string> = {
  1: "#fbbf24", // gold - kept as static decorative colors
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
// PulsingDot — the "Live" indicator
// ---------------------------------------------------------------------------

function PulsingDot() {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1000 }),
      -1,
      true,
    );
    scale.value = withRepeat(
      withTiming(0.8, { duration: 1000 }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.success,
        },
        animatedStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// RankChangeIndicator — brief up/down arrow with highlight flash
// ---------------------------------------------------------------------------

function RankChangeIndicator({
  rankChange,
}: {
  rankChange: "up" | "down" | "same" | null;
}) {
  const { colors } = useTheme();
  if (rankChange === "same" || rankChange === null) return null;

  const isUp = rankChange === "up";
  return (
    <Animated.View
      entering={ZoomIn.duration(200).springify()}
      exiting={ZoomOut.duration(200)}
    >
      {isUp ? (
        <ChevronUp size={16} color={colors.success} strokeWidth={3} />
      ) : (
        <ChevronDown size={16} color={colors.danger} strokeWidth={3} />
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard Entry Card
// ---------------------------------------------------------------------------

function LeaderboardCard({
  entry,
  isCurrentUser,
  rankChange,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  rankChange: "up" | "down" | "same" | null;
}) {
  const { colors, accent } = useTheme();
  const medalColor = MEDAL_COLORS[entry.rank];
  const isRankOne = entry.rank === 1;

  return (
    <Animated.View
      layout={Layout.springify().damping(15).stiffness(120)}
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
    >
      <Card
        variant={isRankOne ? "elevated" : "flat"}
        style={{
          backgroundColor: isCurrentUser
            ? accent.accentSoft
            : isRankOne
              ? colors.white
              : colors.surface,
          borderColor: isRankOne
            ? accent.accent
            : isCurrentUser
              ? accent.accent
              : colors.border,
          borderWidth: isRankOne ? 2 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        {/* Rank with change indicator */}
        <View style={{ alignItems: "center", gap: 2 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: medalColor
                ? medalColor + "20"
                : colors.surfaceMuted,
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
          <RankChangeIndicator rankChange={rankChange} />
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
          <AnimatedScore
            value={entry.score}
            duration={400}
            style={{
              fontSize: 20,
              lineHeight: 26,
              fontWeight: "600",
              color: isCurrentUser ? accent.accentText : colors.text,
            }}
          />
          <ThemedText variant="small" muted>
            / {entry.max_score}
          </ThemedText>
        </View>
      </Card>
    </Animated.View>
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
  const { colors, accent, resolvedMode } = useTheme();
  // Track previous ranks for change detection
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [rankChanges, setRankChanges] = useState<Map<string, "up" | "down" | "same" | null>>(new Map());

  useEffect(() => {
    const newChanges = new Map<string, "up" | "down" | "same" | null>();
    const prevRanks = prevRanksRef.current;

    for (const entry of entries) {
      const prevRank = prevRanks.get(entry.student_id);
      if (prevRank !== undefined && prevRank !== entry.rank) {
        newChanges.set(entry.student_id, prevRank > entry.rank ? "up" : "down");
      } else {
        newChanges.set(entry.student_id, "same");
      }
    }

    // Update previous ranks
    const newPrevRanks = new Map<string, number>();
    for (const entry of entries) {
      newPrevRanks.set(entry.student_id, entry.rank);
    }
    prevRanksRef.current = newPrevRanks;

    if (entries.length > 0) {
      setRankChanges(newChanges);
    }
  }, [entries]);

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <AnimatedListItem index={index} staggerMs={30}>
      <LeaderboardCard
        entry={item}
        isCurrentUser={item.student_id === user?.id}
        rankChange={rankChanges.get(item.student_id) ?? null}
      />
    </AnimatedListItem>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={Trophy}
        title="No submissions yet"
        message="Be the first to take this quiz!"
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ScreenHeader
          title="Leaderboard"
          subtitle={`${entries.length} submission${entries.length !== 1 ? "s" : ""}`}
          onBack={() => router.back()}
        />

        {/* Live indicator — animated pulsing dot */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
            backgroundColor: modeColor(resolvedMode, "#dcfce7", "#052e16"),
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            alignSelf: "flex-start",
          }}
        >
          <PulsingDot />
          <ThemedText
            variant="small"
            style={{ color: colors.success, fontWeight: "600" }}
          >
            Live
          </ThemedText>
        </View>

        {/* Leaderboard list */}
        {loading && entries.length === 0 ? (
          <FadeInView>
            <View style={{ gap: spacing.sm }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          </FadeInView>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.student_id}
            renderItem={renderEntry}
            extraData={rankChanges}
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
