import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { colors, getAccent, radii, spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Class } from "@/types";

type LookupState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "found"; classData: Class & { teacher_name: string | null } }
  | { stage: "error"; message: string };

export default function JoinClassScreen() {
  const accent = getAccent("student");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ stage: "idle" });
  const [joining, setJoining] = useState(false);

  const handleLookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLookup({ stage: "loading" });

    // Look up the class by code, joining the teacher's profile
    const { data, error } = await supabase
      .from("classes")
      .select("*, teacher:profiles!classes_teacher_id_fkey(full_name)")
      .eq("class_code", trimmed)
      .single();

    if (error || !data) {
      setLookup({
        stage: "error",
        message: "Invalid class code. Please check and try again.",
      });
      return;
    }

    const classData = data as unknown as Class & {
      teacher: { full_name: string | null } | null;
    };

    setLookup({
      stage: "found",
      classData: {
        ...classData,
        teacher_name: classData.teacher?.full_name ?? null,
      },
    });
  };

  const handleJoin = async () => {
    if (lookup.stage !== "found" || !user) return;
    setJoining(true);

    const { error } = await supabase.from("class_members").insert({
      class_id: lookup.classData.id,
      student_id: user.id,
    });

    setJoining(false);

    if (error) {
      // Check for unique constraint violation (already joined)
      if (error.code === "23505") {
        setLookup({
          stage: "error",
          message: "You've already joined this class.",
        });
      } else {
        setLookup({ stage: "error", message: error.message });
      }
      return;
    }

    // Success — navigate back to My Classes
    router.replace(Routes.student);
  };

  const handleReset = () => {
    setCode("");
    setLookup({ stage: "idle" });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, gap: spacing.lg }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingTop: spacing.lg,
            }}
          >
            <Pressable onPress={() => router.back()}>
              <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
            </Pressable>
            <ThemedText variant="display">Join a Class</ThemedText>
          </View>

          <ThemedText muted>
            Enter the class code provided by your teacher to join their class.
          </ThemedText>

          {/* Code input */}
          {lookup.stage !== "found" && (
            <View style={{ gap: spacing.md }}>
              <TextField
                label="Class Code"
                placeholder="e.g. ABC123"
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  if (lookup.stage === "error") setLookup({ stage: "idle" });
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                error={lookup.stage === "error" ? lookup.message : undefined}
              />
              <Button
                label="Find Class"
                fullWidth
                loading={lookup.stage === "loading"}
                onPress={handleLookup}
                disabled={!code.trim()}
              />
            </View>
          )}

          {/* Loading */}
          {lookup.stage === "loading" && (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
              <ActivityIndicator size="large" color={accent.accent} />
              <ThemedText muted style={{ marginTop: spacing.md }}>
                Looking up class...
              </ThemedText>
            </View>
          )}

          {/* Confirmation card */}
          {lookup.stage === "found" && (
            <View style={{ gap: spacing.lg }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.lg,
                  gap: spacing.md,
                }}
              >
                <View
                  style={{
                    alignSelf: "flex-start",
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
                    Class Found
                  </ThemedText>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <ThemedText variant="heading">
                    {lookup.classData.name}
                  </ThemedText>
                  <ThemedText variant="caption" muted>
                    {lookup.classData.subject}
                    {lookup.classData.section
                      ? ` · ${lookup.classData.section}`
                      : ""}
                  </ThemedText>
                </View>

                {lookup.classData.teacher_name && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: accent.accentMuted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        variant="small"
                        style={{
                          color: accent.accentText,
                          fontWeight: "600",
                        }}
                      >
                        {lookup.classData.teacher_name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText variant="caption" muted>
                      {lookup.classData.teacher_name}
                    </ThemedText>
                  </View>
                )}

                <View
                  style={{
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radii.sm,
                    padding: spacing.md,
                    alignItems: "center",
                  }}
                >
                  <ThemedText variant="small" muted>
                    Class Code
                  </ThemedText>
                  <ThemedText
                    variant="heading"
                    style={{ letterSpacing: 2, marginTop: spacing.xs }}
                  >
                    {lookup.classData.class_code}
                  </ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  fullWidth
                  onPress={handleReset}
                />
                <Button
                  label="Join Class"
                  fullWidth
                  loading={joining}
                  onPress={handleJoin}
                />
              </View>
            </View>
          )}

          {/* Error with retry */}
          {lookup.stage === "error" && (
            <View style={{ alignItems: "center", gap: spacing.md }}>
              <Button
                label="Try Again"
                variant="secondary"
                onPress={handleReset}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
