import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Layout } from "react-native-reanimated";
import { Trash2 } from "lucide-react-native";

import {
  Button,
  IconButton,
  Screen,
  ScreenHeader,
  SkeletonCard,
  ThemedText,
  useToast,
} from "@/components";
import {
  radii,
  spacing,
  typography,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useClass } from "@/hooks/useClasses";
import {
  useGradeCategories,
  useSaveGradeCategories,
} from "@/hooks/useGradeEngine";
import type { GradeCategory } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditableCategory = {
  key: string; // local temp key for React list
  id?: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEditable(cats: GradeCategory[]): EditableCategory[] {
  return cats.map((c) => ({
    key: c.id,
    id: c.id,
    name: c.name,
  }));
}

// ---------------------------------------------------------------------------
// Grade Settings Screen
// ---------------------------------------------------------------------------

export default function GradeSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const { classData } = useClass(classId);
  const { categories, loading } = useGradeCategories(classId);
  const { save, saving } = useSaveGradeCategories(classId);
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<EditableCategory[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Seed from DB once loaded
  useEffect(() => {
    if (!loading && !initialized) {
      if (categories.length > 0) {
        setItems(toEditable(categories));
      } else {
        // Default: single "Quizzes" category
        setItems([{ key: "default", name: "Quizzes" }]);
      }
      setInitialized(true);
    }
  }, [loading, categories, initialized]);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, name: "" },
    ]);
  };

  const handleRemove = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleUpdate = (key: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, name: value } : i)),
    );
  };

  const handleSave = async () => {
    // Validate all names are non-empty
    const emptyName = items.find((i) => !i.name.trim());
    if (emptyName) {
      toast.show("All categories must have a name.", { type: "error" });
      return;
    }

    const result = await save(
      items.map((i) => ({
        id: i.id,
        name: i.name.trim(),
      })),
    );

    if (result.success) {
      toast.show("Categories saved!");
      router.back();
    } else {
      toast.show(result.error ?? "Failed to save categories.", {
        type: "error",
      });
    }
  };

  if (loading && !initialized) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <ScreenHeader
          title="Grade Settings"
          subtitle={classData?.name}
          onBack={() => router.back()}
        />

        {/* Explanation */}
        <View
          style={{
            backgroundColor: accent.accentSoft,
            borderRadius: radii.md,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <ThemedText
            variant="body"
            style={{ color: accent.accentText, marginBottom: spacing.xs }}
          >
            Organize activities with categories.
          </ThemedText>
          <ThemedText variant="small" style={{ color: accent.accentText }}>
            Categories are used to group and filter activities. They do not
            affect the final grade — grades are calculated from the points you
            earn on each graded activity.
          </ThemedText>
        </View>

        {/* Category list */}
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ThemedText variant="title">Categories</ThemedText>
            <Pressable onPress={handleAdd}>
              <ThemedText style={{ color: accent.accent, fontWeight: "600" }}>
                + Add Category
              </ThemedText>
            </Pressable>
          </View>

          {items.map((item) => (
            <Animated.View
              key={item.key}
              layout={Layout.springify()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
              }}
            >
              {/* Name input */}
              <View style={{ flex: 1 }}>
                <ThemedText variant="small" muted style={{ marginBottom: 2 }}>
                  Name
                </ThemedText>
                <TextInput
                  placeholder="e.g. Quizzes"
                  placeholderTextColor={colors.textSubtle}
                  value={item.name}
                  onChangeText={(v) => handleUpdate(item.key, v)}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    color: colors.text,
                    fontSize: typography.body.fontSize,
                  }}
                />
              </View>

              {/* Remove button */}
              <IconButton
                icon={Trash2}
                color={colors.danger}
                onPress={() => handleRemove(item.key)}
                size={18}
              />
            </Animated.View>
          ))}
        </View>

        {/* Save button */}
        <Button
          label={saving ? "Saving..." : "Save Categories"}
          onPress={handleSave}
          loading={saving}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
