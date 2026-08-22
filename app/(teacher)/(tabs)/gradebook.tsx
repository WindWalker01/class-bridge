import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  View,
} from "react-native";

import {
  AnimatedListItem,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  SkeletonCard,
  ThemedText,
} from "@/components";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useTeacherClasses } from "@/hooks/useClasses";
import { Routes } from "@/lib/navigation";
import type { ClassWithCount } from "@/types";

export default function TeacherGradebookPickerScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const router = useRouter();
  const { classes, loading, refreshing, refresh } = useTeacherClasses();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderClassCard = ({ item }: { item: ClassWithCount }) => (
    <Card
      variant="elevated"
      onPress={() => router.push(Routes.classGradebook(item.id))}
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
      <ThemedText variant="small" muted style={{ marginTop: spacing.xs }}>
        {item.student_count} {item.student_count === 1 ? "student" : "students"}
      </ThemedText>
    </Card>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        title="No classes yet"
        message="Create a class first to access the gradebook."
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
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <ThemedText variant="display">Gradebook</ThemedText>
          <ThemedText muted>
            Select a class to view its gradebook
          </ThemedText>
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