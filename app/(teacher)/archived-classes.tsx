import { router, useFocusEffect } from "expo-router";
import { Archive, ArchiveRestore } from "lucide-react-native";
import { useCallback } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import {
  AnimatedListItem,
  Card,
  EmptyState,
  FadeInView,
  IconButton,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
  useToast,
} from "@/components";
import { spacing } from "@/constants/theme";
import {
  unarchiveClass,
  useTeacherArchivedClasses,
} from "@/hooks/useClasses";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/hooks/useTheme";
import type { ClassWithCount } from "@/types";

function formatArchivedAt(iso: string | null): string {
  if (!iso) return "Archived";
  return `Archived ${new Date(iso).toLocaleDateString()}`;
}

export default function ArchivedClassesScreen() {
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { classes, loading, refreshing, refresh } =
    useTeacherArchivedClasses();
  const { show } = useToast();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleUnarchive = async (item: ClassWithCount) => {
    const { error } = await unarchiveClass(item.id);
    if (error) {
      show(error.message || "Failed to restore class.", { type: "error" });
      return;
    }
    show(`"${item.name}" restored`, { type: "success" });
    void refresh();
  };

  const renderArchivedCard = ({ item }: { item: ClassWithCount }) => (
    <Card variant="elevated">
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
          <ThemedText variant="small" muted>
            Code: {item.class_code}
          </ThemedText>
          <ThemedText variant="small" style={{ color: colors.textSubtle }}>
            {formatArchivedAt(item.archived_at)}
          </ThemedText>
        </View>
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
            gap: spacing.xs,
          }}
        >
          <IconButton
            icon={ArchiveRestore}
            variant="filled"
            backgroundColor={accent.accent}
            color={colors.white}
            size={20}
            onPress={() => handleUnarchive(item)}
            accessibilityLabel={`Unarchive ${item.name}`}
          />
          <ThemedText variant="small" style={{ color: accent.accentText }}>
            Restore
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon={Archive}
        title="No archived classes"
        message="Classes you archive will appear here so you can restore them later."
        actionLabel="Back to Classes"
        onAction={() => router.back()}
      />
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ScreenHeader
          title="Archived Classes"
          subtitle={`${classes.length} ${
            classes.length === 1 ? "class" : "classes"
          }`}
          onBack={() => router.back()}
        />

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
                {renderArchivedCard({ item })}
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