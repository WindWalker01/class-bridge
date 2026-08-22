import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import {
  AnimatedListItem,
  Card,
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
    <Card
      variant="elevated"
      onPress={() => {
        const { router } = require("expo-router");
        router.push(Routes.classFeed(item.id));
      }}
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
        <View
          style={{
            backgroundColor: accent.accentSoft,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: accent.accentText, fontWeight: "600" }}
          >
            {item.student_count}{" "}
            {item.student_count === 1 ? "student" : "students"}
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="small" muted>
        Code: {item.class_code}
      </ThemedText>
    </Card>
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
          onPress={() => {
            const { router } = require("expo-router");
            router.push(Routes.createClass);
          }}
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