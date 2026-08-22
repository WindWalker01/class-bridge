import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import {
  Button,
  Card,
  FadeInView,
  Screen,
  ScreenHeader,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { Avatar } from "@/components/Avatar";
import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { haptics } from "@/lib/haptics";
import type { Class } from "@/types";

type LookupState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "found"; classData: Class & { teacher_name: string | null } }
  | { stage: "error"; message: string };

export default function JoinClassScreen() {
  const { colors, accent } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { show } = useToast();

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ stage: "idle" });
  const [joining, setJoining] = useState(false);

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLookup({ stage: "loading" });

    // Look up the class by code using a security-definer RPC that bypasses
    // RLS so unenrolled students can find the class before joining.
    const { data, error } = await supabase
      .rpc("get_class_by_code", { p_class_code: trimmed })
      .single();

    if (error || !data) {
      setLookup({ stage: "idle" });
      show("Invalid class code. Please check and try again.", {
        type: "error",
      });
      return;
    }

    const classData = data as unknown as Class & {
      teacher_name: string | null;
    };

    setLookup({
      stage: "found",
      classData,
    });
  };

  const handleJoin = async () => {
    if (lookup.stage !== "found" || !user) return;
    setJoining(true);
    haptics.medium();

    const { error } = await supabase.from("class_members").insert({
      class_id: lookup.classData.id,
      student_id: user.id,
    });

    setJoining(false);

    if (error) {
      // Check for unique constraint violation (already joined)
      if (error.code === "23505") {
        show("You've already joined this class.", { type: "error" });
      } else {
        show(error.message, { type: "error" });
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
          <ScreenHeader
            title="Join a Class"
            onBack={() => router.back()}
          />

          <ThemedText muted>
            Enter the class code provided by your teacher to join their class.
          </ThemedText>

          {/* Code input */}
          {lookup.stage !== "found" && (
            <FadeInView key="input">
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
                />
                <Button
                  label="Find Class"
                  fullWidth
                  loading={lookup.stage === "loading"}
                  onPress={handleLookup}
                  disabled={!code.trim()}
                />
              </View>
            </FadeInView>
          )}

          {/* Loading */}
          {lookup.stage === "loading" && (
            <FadeInView key="loading">
              <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
                <ThemedText muted style={{ marginTop: spacing.md }}>
                  Looking up class...
                </ThemedText>
              </View>
            </FadeInView>
          )}

          {/* Confirmation card */}
          {lookup.stage === "found" && (
            <FadeInView key="found">
              <View style={{ gap: spacing.lg }}>
                <Card variant="elevated">
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
                      <Avatar
                        name={lookup.classData.teacher_name}
                        size={28}
                      />
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
                </Card>

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
            </FadeInView>
          )}

          {/* Error with retry */}
          {lookup.stage === "error" && (
            <FadeInView key="error">
              <View style={{ alignItems: "center", gap: spacing.md }}>
                <Button
                  label="Try Again"
                  variant="secondary"
                  onPress={handleReset}
                />
              </View>
            </FadeInView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
