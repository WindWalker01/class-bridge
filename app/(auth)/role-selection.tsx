import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button, Screen, ThemedText } from "@/components";
import { roleAccents, spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/types";

export default function RoleSelectionScreen() {
  const router = useRouter();
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const handleSelect = async (role: Role) => {
    await updateProfile({ role, onboarded: false });
    router.replace(Routes.profileSetup);
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <ThemedText variant="title">Choose your role</ThemedText>
        <ThemedText muted>Are you a teacher or a student?</ThemedText>

        {(Object.keys(roleAccents) as Role[]).map((role) => (
          <Button
            key={role}
            label={`Continue as ${roleAccents[role].label}`}
            fullWidth
            onPress={() => void handleSelect(role)}
          />
        ))}
      </View>
    </Screen>
  );
}
