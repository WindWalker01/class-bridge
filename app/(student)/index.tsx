import { View } from "react-native";

import { Screen, ThemedText } from "@/components";
import { getAccent, spacing } from "@/constants/theme";

export default function StudentHomeScreen() {
  const accent = getAccent("student");

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
            Student
          </ThemedText>
        </View>

        <ThemedText variant="display">Student Home</ThemedText>
        <ThemedText muted>
          Your learning dashboard will live here — classes, assignments, and
          grades.
        </ThemedText>
      </View>
    </Screen>
  );
}
