import { router, useFocusEffect } from "expo-router";
import { Archive, Plus } from "lucide-react-native";
import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import {
  AnimatedListItem,
  ClassCard,
  EmptyState,
  FadeInView,
  IconButton,
  Screen,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { Avatar } from "@/components/Avatar";
import { radii, spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherClasses } from "@/hooks/useClasses";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { Routes } from "@/lib/navigation";
import type { ClassWithCount } from "@/types";

export default function TeacherHomeScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { classes, loading, refreshing, refresh } = useTeacherClasses();
  const { profile } = useAuth();

  // Refresh when screen comes into focus (e.g. after creating a class)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderClassCard = ({ item }: { item: ClassWithCount }) => (
    <ClassCard
      title={item.name}
      subtitle={`${item.subject}${item.section ? ` · ${item.section}` : ""}`}
      badge={`${item.student_count} ${item.student_count === 1 ? "student" : "students"}`}
      onPress={() => router.push(Routes.classFeed(item.id))}
      footer={
        <View
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.sm,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: 3,
          }}
        >
          <ThemedText
            variant="small"
            style={{
              color: colors.textMuted,
              fontWeight: "600",
              letterSpacing: 1.5,
            }}
          >
            {item.class_code}
          </ThemedText>
        </View>
      }
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title="No classes yet"
        message="Create your first class to get started!"
        actionLabel="Create Class"
        onAction={() => router.push(Routes.createClass)}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push(Routes.teacherArchivedClasses)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Archive size={16} color={colors.textMuted} strokeWidth={2} />
              <ThemedText variant="small" style={{ color: colors.textMuted }}>
                Archived
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push(Routes.teacherSettings)}
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
              paddingBottom: 100, // space for FAB
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

        {/* FAB — Create Class */}
        <IconButton
          icon={Plus}
          variant="filled"
          backgroundColor={accent.accent}
          color={colors.white}
          size={28}
          onPress={() => router.push(Routes.createClass)}
          style={{
            position: "absolute",
            bottom: spacing.lg,
            right: spacing.lg,
          }}
        />
      </View>
    </Screen>
  );
}