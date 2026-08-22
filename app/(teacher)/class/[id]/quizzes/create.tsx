import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { BookOpen, Timer, Zap } from "lucide-react-native";
import { modeColor, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { supabase } from "@/lib/supabase";
import type { QuizMode } from "@/types";

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
