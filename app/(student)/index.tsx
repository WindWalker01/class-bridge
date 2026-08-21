import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";

import { Screen, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useStudentClasses } from "@/hooks/useClasses";
import { Routes } from "@/lib/navigation";
import type { ClassWithTeacher } from "@/types";

export default function StudentHomeScreen() {
  const accent = getAccent("student");
  const router = useRouter();
  const { signOut } = useAuth();
  const { classes, loading, refreshing, refresh } = useStudentClasses();

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  // Refresh when screen comes into focus (e.g. after joining a class)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderClassCard = ({ item }: { item: ClassWithTeacher }) => (
    <Pressable
      onPress={() => router.push(Routes.studentClassFeed(item.id))}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
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
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: accent.accentMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            variant="small"
            style={{ color: accent.accentText, fontWeight: "600" }}
          >
            {item.teacher?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </ThemedText>
        </View>
        <ThemedText variant="small" muted>
          {item.teacher?.full_name ?? "Unknown Teacher"}
        </ThemedText>
      </View>
    </Pressable>
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
          gap: spacing.md,
        }}
      >
        <ThemedText variant="heading" muted>
          No classes yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          You haven't joined any classes yet.{"\n"}Enter a class code to get
          started.
        </ThemedText>
        <Pressable
          onPress={() => router.push(Routes.studentJoinClass)}
          style={{
            backgroundColor: accent.accent,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
          }}
        >
          <ThemedText style={{ color: colors.white, fontWeight: "600" }}>
            Join a Class
          </ThemedText>
        </Pressable>
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
              onPress={handleSignOut}
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
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Class list */}
        {loading && classes.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color={accent.accent} />
          </View>
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(item) => item.id}
            renderItem={renderClassCard}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{
              gap: spacing.md,
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
      </View>
    </Screen>
  );
}
