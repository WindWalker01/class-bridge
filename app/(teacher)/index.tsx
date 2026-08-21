import { View } from "react-native";

import { Screen, ThemedText } from "@/components";
import { getAccent, spacing } from "@/constants/theme";

export default function TeacherHomeScreen() {
  const accent = getAccent("teacher");

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: accent.accentSoft,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: 999,
          }}
        >
          <ThemedText variant="caption" style={{ color: accent.accentText }}>
            Teacher
          </ThemedText>
        </View>

        <ThemedText variant="display">Teacher Home</ThemedText>
        <ThemedText muted>
          Your classroom dashboard will live here — classes, students, and
          assignments.
        </ThemedText>
      </View>
    </Screen>
  );
}
