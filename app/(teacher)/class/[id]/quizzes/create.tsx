import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import type { QuizMode } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODE_OPTIONS: { key: QuizMode; label: string; description: string }[] = [
  {
    key: "standard",
    label: "Standard",
    description:
      "Sequential questions, no timers. Students work at their own pace.",
  },
  {
    key: "timed",
    label: "Timed Questions",
    description:
      "Per-question countdown timer. Auto-advances when time expires.",
  },
  {
    key: "gamified",
    label: "Gamified",
    description:
      "Points with speed bonuses, streak tracking, and live score display.",
  },
];

const accent = getAccent("teacher");

// ---------------------------------------------------------------------------
// Create Quiz Screen
// ---------------------------------------------------------------------------

export default function CreateQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<QuizMode>("standard");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        status: "draft",
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      Alert.alert("Error", insertError.message);
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <ThemedText variant="heading">Create Quiz</ThemedText>
        </View>

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
            return (
              <Pressable
                key={option.key}
                onPress={() => setMode(option.key)}
                style={{
                  backgroundColor: isSelected
                    ? accent.accentSoft
                    : colors.surface,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: isSelected ? accent.accent : colors.border,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? accent.accent
                        : colors.textMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: accent.accent,
                        }}
                      />
                    )}
                  </View>
                  <ThemedText variant="body" style={{ fontWeight: "600" }}>
                    {option.label}
                  </ThemedText>
                </View>
                <ThemedText variant="small" muted style={{ marginLeft: 28 }}>
                  {option.description}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

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
