import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { BookOpen } from "lucide-react-native";

import {
  AnimatedListItem,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { Avatar } from "@/components/Avatar";
import { radii, spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useStudentClasses } from "@/hooks/useClasses";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Routes } from "@/lib/navigation";
import type { ClassWithTeacher } from "@/types";

export default function StudentHomeScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const router = useRouter();
  const { profile } = useAuth();
  const { classes, loading, refreshing, refresh } = useStudentClasses();

  // Refresh when screen comes into focus (e.g. after joining a class)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );


  const renderClassCard = ({ item }: { item: ClassWithTeacher }) => (
    <Card
      variant="elevated"
      onPress={() => router.push(Routes.studentClassFeed(item.id))}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText variant="caption" muted>
            {item.subject}
            {item.section ? ` · ${item.section}` : ""}
          </ThemedText>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Avatar
          name={item.teacher?.full_name ?? "Unknown"}
          size={24}
        />
        <ThemedText variant="small" muted>
          {item.teacher?.full_name ?? "Unknown Teacher"}
        </ThemedText>
      </View>
    </Card>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={BookOpen}
        title="No classes yet"
        message={
          "You haven't joined any classes yet.\nEnter a class code to get started."
        }
        actionLabel="Join a Class"
        onAction={() => router.push(Routes.studentJoinClass)}
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <View>
            <ThemedText variant="display">My Classes</ThemedText>
            <ThemedText muted>
              {classes.length} {classes.length === 1 ? "class" : "classes"}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push(Routes.studentJoinClass)}
              style={{
                backgroundColor: accent.accentSoft,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <ThemedText
                variant="small"
                style={{ color: accent.accentText, fontWeight: "600" }}
              >
                + Join
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push(Routes.studentSettings)}
              accessibilityLabel="Open settings"
            >
              <Avatar
                uri={profile?.avatar_url}
                name={profile?.full_name ?? "User"}
                size={32}
              />
            </Pressable>
          </View>
        </View>

        {/* Class list */}
        {loading && classes.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingTop: spacing.xxl,
            }}
          >
            <FadeInView>
              <View style={{ gap: spacing.md }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            </FadeInView>
          </View>
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(item) => item.id}
            key={isTablet ? "grid" : "list"}
            numColumns={isTablet ? 2 : undefined}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                {renderClassCard({ item })}
              </AnimatedListItem>
            )}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            columnWrapperStyle={isTablet ? { gap: spacing.md } : undefined}
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
