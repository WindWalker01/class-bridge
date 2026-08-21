import { useFocusEffect } from "expo-router";
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
import { useTeacherClasses } from "@/hooks/useClasses";
import { Routes } from "@/lib/navigation";
import type { ClassWithCount } from "@/types";

export default function TeacherHomeScreen() {
  const accent = getAccent("teacher");
  const { signOut } = useAuth();
  const { classes, loading, refreshing, refresh } = useTeacherClasses();

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

  // Refresh when screen comes into focus (e.g. after creating a class)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renderClassCard = ({ item }: { item: ClassWithCount }) => (
    <Pressable
      onPress={() => {
        // Navigate to class feed — using router.push directly
        const { router } = require("expo-router");
        router.push(Routes.classFeed(item.id));
      }}
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
        }}
      >
        <ThemedText
          variant="heading"
          muted
          style={{ marginBottom: spacing.sm }}
        >
          No classes yet
        </ThemedText>
        <ThemedText muted style={{ textAlign: "center" }}>
          Create your first class to get started.
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
              paddingBottom: 100, // space for FAB
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

        {/* FAB — Create Class */}
        <Pressable
          onPress={() => {
            const { router } = require("expo-router");
            router.push(Routes.createClass);
          }}
          style={{
            position: "absolute",
            bottom: spacing.lg,
            right: spacing.lg,
            backgroundColor: accent.accent,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            // Shadow
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <ThemedText
            style={{
              color: colors.white,
              fontSize: 28,
              lineHeight: 30,
              fontWeight: "300",
            }}
          >
            +
          </ThemedText>
        </Pressable>
      </View>
    </Screen>
  );
}
