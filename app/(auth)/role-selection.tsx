import { useRouter } from "expo-router";
import { GraduationCap, Presentation } from "lucide-react-native";

import { View } from "react-native";

import { Card, FadeInUp, Screen, ThemedText } from "@/components";
import { getRoleAccents, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Routes } from "@/lib/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/types";

const ROLE_ICONS: Record<Role, typeof GraduationCap> = {
  teacher: Presentation,
  student: GraduationCap,
};

export default function RoleSelectionScreen() {
  const router = useRouter();
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { resolvedMode } = useTheme();
  const roleAccents = getRoleAccents(resolvedMode);

  const handleSelect = async (role: Role) => {
    await updateProfile({ role, onboarded: false });
    router.replace(Routes.profileSetup);
  };

  return (
    <Screen>
      <FadeInUp>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
          <ThemedText variant="title">Choose your role</ThemedText>
          <ThemedText muted>Are you a teacher or a student?</ThemedText>

          {(Object.keys(roleAccents) as Role[]).map((role) => {
            const accent = roleAccents[role];
            const Icon = ROLE_ICONS[role];
            return (
              <Card
                key={role}
                variant="elevated"
                onPress={() => void handleSelect(role)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: accent.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={28} color={accent.accent} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    variant="heading"
                    style={{ color: accent.accentText }}
                  >
                    {accent.label}
                  </ThemedText>
                  <ThemedText variant="caption" muted>
                    {role === "teacher"
                      ? "Create classes, quizzes, and grade your students."
                      : "Join classes, take quizzes, and track your grades."}
                  </ThemedText>
                </View>
              </Card>
            );
          })}
        </View>
      </FadeInUp>
    </Screen>
  );
}
