import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { getAccent, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

/** Generate a random 6-character alphanumeric class code. */
function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateClassScreen() {
  const accent = getAccent("teacher");
  const user = useAuthStore((state) => state.user);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; subject?: string }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Class name is required";
    else if (name.trim().length < 2)
      next.name = "Name must be at least 2 characters";
    if (!subject.trim()) next.subject = "Subject is required";
    else if (subject.trim().length < 2)
      next.subject = "Subject must be at least 2 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (!validate() || !user) return;
    setLoading(true);

    const classCode = generateClassCode();

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name: name.trim(),
        subject: subject.trim(),
        section: section.trim() || null,
        class_code: classCode,
        teacher_id: user.id,
      })
      .select("id, class_code")
      .single();

    setLoading(false);

    if (error) {
      // If code collision (extremely unlikely), retry once
      if (error.code === "23505") {
        const retryCode = generateClassCode();
        setLoading(true);
        const { data: retryData, error: retryError } = await supabase
          .from("classes")
          .insert({
            name: name.trim(),
            subject: subject.trim(),
            section: section.trim() || null,
            class_code: retryCode,
            teacher_id: user.id,
          })
          .select("id, class_code")
          .single();
        setLoading(false);

        if (retryError) {
          Alert.alert("Error", "Failed to create class. Please try again.");
          return;
        }

        showSuccess(retryData.class_code);
        return;
      }

      Alert.alert("Error", error.message || "Failed to create class.");
      return;
    }

    showSuccess(data.class_code);
  };

  const showSuccess = (classCode: string) => {
    Alert.alert(
      "Class Created!",
      `Share this code with your students so they can join:\n\n${classCode}`,
      [
        {
          text: "Copy Code",
          onPress: async () => {
            try {
              const Clipboard = require("expo-clipboard");
              await Clipboard.setStringAsync(classCode);
              Alert.alert("Copied", "Class code copied to clipboard!");
            } catch {
              // Clipboard not available — ignore
            }
          },
        },
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.lg }}>
        {/* Header */}
        <View style={{ marginBottom: spacing.xl }}>
          <ThemedText variant="display">Create Class</ThemedText>
          <ThemedText muted>Set up a new class for your students.</ThemedText>
        </View>

        {/* Form */}
        <View style={{ gap: spacing.lg }}>
          <TextField
            label="Class Name"
            placeholder="e.g. Algebra 101"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            error={errors.name}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <TextField
            label="Subject"
            placeholder="e.g. Mathematics"
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject)
                setErrors((e) => ({ ...e, subject: undefined }));
            }}
            error={errors.subject}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <TextField
            label="Section (optional)"
            placeholder="e.g. Block A, Period 3"
            value={section}
            onChangeText={setSection}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {/* Actions */}
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button
            label="Create Class"
            fullWidth
            loading={loading}
            onPress={handleCreate}
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </View>
    </Screen>
  );
}
