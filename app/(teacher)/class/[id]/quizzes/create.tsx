import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";

import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { BookOpen, Calendar, ChevronDown, Timer, X, Zap } from "lucide-react-native";
import { modeColor, radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useGradeCategories } from "@/hooks/useGradeEngine";
import { supabase } from "@/lib/supabase";
import type { GradeCategory, QuizMode, SpeedBonusTier } from "@/types";
import { DEFAULT_SPEED_BONUS_TIERS } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODE_OPTIONS: {
  key: QuizMode;
  label: string;
  description: string;
  icon: typeof Timer;
}[] = [
  {
    key: "standard",
    label: "Standard",
    description:
      "Sequential questions, no timers. Students work at their own pace.",
    icon: BookOpen,
  },
  {
    key: "timed",
    label: "Timed Questions",
    description:
      "Per-question countdown timer. Auto-advances when time expires.",
    icon: Timer,
  },
  {
    key: "gamified",
    label: "Gamified",
    description:
      "Points with speed bonuses, streak tracking, and live score display.",
    icon: Zap,
  },
];

// ---------------------------------------------------------------------------
// Create Quiz Screen
// ---------------------------------------------------------------------------

export default function CreateQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";
  const { colors, accent } = useTheme();
  const { isTablet } = useResponsive();
  const { show } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<QuizMode>("standard");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speedBonusTiers, setSpeedBonusTiers] = useState<SpeedBonusTier[]>(
    DEFAULT_SPEED_BONUS_TIERS,
  );

  // Grade categories
  const { categories, loading: catLoading } = useGradeCategories(classId);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const updateTier = (index: number, field: keyof SpeedBonusTier, value: string) => {
    setSpeedBonusTiers((prev) => {
      const updated = [...prev];
      const num = parseFloat(value);
      if (!isNaN(num)) {
        updated[index] = { ...updated[index], [field]: field === "maxTimeSeconds" ? Math.round(num) : num };
      }
      return updated;
    });
  };

  const addTier = () => {
    setSpeedBonusTiers((prev) => [
      ...prev,
      { maxTimeSeconds: (prev[prev.length - 1]?.maxTimeSeconds ?? 30) + 15, multiplier: 1.0 },
    ]);
  };

  const removeTier = (index: number) => {
    setSpeedBonusTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate((prev) => {
        const updated = new Date(selectedDate);
        if (prev) {
          // Preserve previously set time
          updated.setHours(prev.getHours(), prev.getMinutes(), prev.getSeconds());
        } else {
          // Default to end of day
          updated.setHours(23, 59, 59, 999);
        }
        return updated;
      });
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && dueDate) {
      const updated = new Date(dueDate);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setDueDate(updated);
    }
  };

  const handleClearDeadline = () => {
    setDueDate(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError("");

    const timeLimitSeconds = timeLimitMinutes
      ? parseInt(timeLimitMinutes, 10) * 60
      : null;

    const { data, error: insertError } = await supabase
      .from("quizzes")
      .insert({
        class_id: classId,
        title: title.trim(),
        description: description.trim() || null,
        mode,
        time_limit_seconds: timeLimitSeconds,
        due_at: dueDate ? dueDate.toISOString() : null,
        status: "draft",
        category_id: categoryId,
        speed_bonus_tiers:
          mode === "gamified" ? speedBonusTiers : null,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      show(insertError.message, { type: "error" });
      return;
    }

    if (data) {
      router.replace(
        `/(teacher)/class/${classId}/quizzes/${data.id}/edit` as any,
      );
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Create Quiz" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl, maxWidth: isTablet ? 520 : undefined, alignSelf: isTablet ? "center" : undefined, width: "100%" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ marginBottom: spacing.md }}>
          <TextField
            label="Quiz Title"
            placeholder="e.g. Chapter 1 Review"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError("");
            }}
            error={error}
          />
        </View>

        {/* Description */}
        <View style={{ marginBottom: spacing.md }}>
          <TextField
            label="Description (optional)"
            placeholder="Brief description of the quiz"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Mode selector */}
        <View style={{ marginBottom: spacing.lg }}>
          <ThemedText
            variant="caption"
            style={{ fontWeight: "600", marginBottom: spacing.sm }}
          >
            Quiz Mode
          </ThemedText>
          {MODE_OPTIONS.map((option) => {
            const isSelected = mode === option.key;
            const Icon = option.icon;
            return (
              <Card
                key={option.key}
                variant={isSelected ? "elevated" : "flat"}
                onPress={() => setMode(option.key)}
                style={{ marginBottom: spacing.sm }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isSelected
                        ? accent.accentSoft
                        : colors.surfaceMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      size={20}
                      color={isSelected ? accent.accent : colors.textMuted}
                      strokeWidth={1.5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="body" style={{ fontWeight: "600" }}>
                      {option.label}
                    </ThemedText>
                    <ThemedText variant="small" muted>
                      {option.description}
                    </ThemedText>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Speed Bonus Tiers (gamified only) */}
        {mode === "gamified" && (
          <View style={{ marginBottom: spacing.lg }}>
            <ThemedText
              variant="caption"
              style={{ fontWeight: "600", marginBottom: spacing.sm }}
            >
              Speed Bonus Tiers
            </ThemedText>
            <ThemedText variant="small" muted style={{ marginBottom: spacing.md }}>
              When a student answers within the time threshold, their points
              are multiplied. Tiers are checked from top to bottom — the first
              match wins.
            </ThemedText>
            {speedBonusTiers.map((tier, index) => (
              <Card
                key={index}
                variant="flat"
                style={{ marginBottom: spacing.sm }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <ThemedText
                    variant="small"
                    style={{ fontWeight: "600", minWidth: 60 }}
                  >
                    Tier {index + 1}
                  </ThemedText>
                  <View style={{ flex: 1, flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
                    <ThemedText variant="small" muted>
                      Time &lt;
                    </ThemedText>
                    <TextField
                      placeholder="sec"
                      value={String(tier.maxTimeSeconds)}
                      onChangeText={(v) => updateTier(index, "maxTimeSeconds", v)}
                      keyboardType="numeric"
                      style={{ flex: 1, minWidth: 50 }}
                    />
                    <ThemedText variant="small" muted>
                      sec → ×
                    </ThemedText>
                    <TextField
                      placeholder="1.0"
                      value={String(tier.multiplier)}
                      onChangeText={(v) => updateTier(index, "multiplier", v)}
                      keyboardType="decimal-pad"
                      style={{ flex: 1, minWidth: 50 }}
                    />
                  </View>
                  {speedBonusTiers.length > 1 && (
                    <Pressable
                      onPress={() => removeTier(index)}
                      style={({ pressed }) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: pressed ? "#fecaca" : colors.surfaceMuted,
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <X size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              </Card>
            ))}
            <Button
              label="+ Add Tier"
              variant="ghost"
              onPress={addTier}
            />
          </View>
        )}

        {/* Overall time limit */}
        <View style={{ marginBottom: spacing.lg }}>
          <TextField
            label="Overall Time Limit (minutes, optional)"
            placeholder="Leave blank for no limit"
            value={timeLimitMinutes}
            onChangeText={setTimeLimitMinutes}
            keyboardType="numeric"
          />
        </View>

        {/* Grade Category (optional) */}
        <View style={{ marginBottom: spacing.lg }}>
          <ThemedText
            variant="caption"
            style={{ fontWeight: "600", marginBottom: spacing.sm }}
          >
            Grade Category
          </ThemedText>
          {catLoading ? (
            <ThemedText variant="small" muted>
              Loading categories...
            </ThemedText>
          ) : categories.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.warning + "18",
                borderRadius: radii.md,
                padding: spacing.sm,
              }}
            >
              <ThemedText variant="small" style={{ color: colors.warning }}>
                No grade categories yet. You can assign one later in the quiz
                editor.
              </ThemedText>
            </View>
          ) : (
            <View>
              <Pressable
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <ThemedText
                  variant="body"
                  style={{
                    color: categoryId ? colors.text : colors.textSubtle,
                  }}
                >
                  {categoryId
                    ? categories.find((c) => c.id === categoryId)?.name ??
                      "Select category..."
                    : "Select category (optional)"}
                </ThemedText>
                <ChevronDown size={18} color={colors.textMuted} />
              </Pressable>

              {showCategoryPicker && (
                <View
                  style={{
                    marginTop: spacing.xs,
                    backgroundColor: colors.surface,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: "hidden",
                  }}
                >
                  {categories.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setShowCategoryPicker(false);
                        }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          backgroundColor: selected
                            ? colors.surfaceMuted
                            : pressed
                              ? colors.surfaceMuted
                              : "transparent",
                        })}
                      >
                        <ThemedText
                          variant="body"
                          style={{ fontWeight: selected ? "600" : "400" }}
                        >
                          {cat.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Deadline (optional) */}
        <View style={{ marginBottom: spacing.lg }}>
          <ThemedText
            variant="caption"
            style={{ fontWeight: "600", marginBottom: spacing.sm }}
          >
            Deadline (optional)
          </ThemedText>
          {dueDate ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }: { pressed: boolean }) => ({
                  flex: 1,
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <ThemedText variant="body">
                  {dueDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {dueDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleClearDeadline}
                style={({ pressed }: { pressed: boolean }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }: { pressed: boolean }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.lg,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Calendar size={20} color={colors.textMuted} />
              <ThemedText muted>
                Set deadline date and time...
              </ThemedText>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && dueDate && (
            <DateTimePicker
              value={dueDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Create button */}
        <Button
          label="Create Quiz & Add Questions"
          fullWidth
          loading={loading}
          onPress={handleCreate}
        />
      </ScrollView>
    </Screen>
  );
}
