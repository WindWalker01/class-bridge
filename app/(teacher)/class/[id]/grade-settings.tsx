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
  weight: string; // editable as string
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEditable(cats: GradeCategory[]): EditableCategory[] {
  return cats.map((c) => ({
    key: c.id,
    id: c.id,
    name: c.name,
    weight: String(c.weight),
  }));
}

function totalWeight(items: EditableCategory[]): number {
  return items.reduce((sum, i) => sum + (parseFloat(i.weight) || 0), 0);
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
        // Default: single "Quizzes" category at 100%
        setItems([{ key: "default", name: "Quizzes", weight: "100" }]);
      }
      setInitialized(true);
    }
  }, [loading, categories, initialized]);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, name: "", weight: "0" },
    ]);
  };

  const handleRemove = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleUpdate = (
    key: string,
    field: "name" | "weight",
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    );
  };

  const handleSave = async () => {
    // Validate all names are non-empty
    const emptyName = items.find((i) => !i.name.trim());
    if (emptyName) {
      toast.show("All categories must have a name.", { type: "error" });
      return;
    }

    // Validate weights sum to 100
    const total = totalWeight(items);
    if (Math.abs(total - 100) > 0.01) {
      toast.show(`Weights must sum to 100%. Current total: ${total}%`, {
        type: "error",
      });
      return;
    }

    const result = await save(
      items.map((i) => ({
        id: i.id,
        name: i.name.trim(),
        weight: parseFloat(i.weight) || 0,
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

  const currentTotal = totalWeight(items);
  const isValid = Math.abs(currentTotal - 100) < 0.01;

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
            Configure weighted grade categories for this class.
          </ThemedText>
          <ThemedText variant="small" style={{ color: accent.accentText }}>
            Weights must sum to exactly 100%. Example: Quizzes 40%, Exams 40%,
            Participation 20%.
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
                  onChangeText={(v) => handleUpdate(item.key, "name", v)}
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

              {/* Weight input */}
              <View style={{ width: 80 }}>
                <ThemedText variant="small" muted style={{ marginBottom: 2 }}>
                  Weight %
                </ThemedText>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.textSubtle}
                  value={item.weight}
                  onChangeText={(v) => handleUpdate(item.key, "weight", v)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    color: colors.text,
                    fontSize: typography.body.fontSize,
                    textAlign: "center",
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

        {/* Weight total indicator */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: isValid
              ? colors.success + "18"
              : colors.danger + "18",
            borderRadius: radii.md,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <ThemedText
            variant="body"
            style={{
              fontWeight: "600",
              color: isValid ? colors.success : colors.danger,
            }}
          >
            Total: {currentTotal}%
          </ThemedText>
          <ThemedText
            variant="small"
            style={{
              color: isValid ? colors.success : colors.danger,
            }}
          >
            {isValid ? "✓ Valid" : "✗ Must equal 100%"}
          </ThemedText>
        </View>

        {/* Save button */}
        <Button
          label={saving ? "Saving..." : "Save Categories"}
          onPress={handleSave}
          disabled={!isValid || saving}
          loading={saving}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
