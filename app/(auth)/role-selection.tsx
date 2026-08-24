import { useRouter } from "expo-router";
import { GraduationCap, Presentation } from "lucide-react-native";
import { Alert, View } from "react-native";

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

  const handleSelect = (role: Role) => {
    const label = roleAccents[role].label;

    Alert.alert("Confirm your role", `Continue as a ${label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: `Continue as ${label}`,
        onPress: async () => {
          await updateProfile({ role, onboarded: false });
          router.replace(Routes.profileSetup);
        },
      },
    ]);
  };

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          width: "100%",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
        }}
      >
        <FadeInUp>
          <View
            style={{
              width: "100%",
              gap: spacing.xl,
            }}
          >
            {/* Header */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="title">Choose your role</ThemedText>

              <ThemedText muted>Are you a teacher or a student?</ThemedText>
            </View>

            {/* Role options */}
            <View style={{ gap: spacing.md }}>
              {(Object.keys(roleAccents) as Role[]).map((role) => {
                const accent = roleAccents[role];
                const Icon = ROLE_ICONS[role];

                return (
                  <Card
                    key={role}
                    variant="elevated"
                    onPress={() => handleSelect(role)}
                    style={{
                      width: "100%",
                      height: 112,
                      flexDirection: "row",
                      alignItems: "center",
                      padding: spacing.md,
                      gap: spacing.md,
                      overflow: "visible",
                    }}
                  >
                    {/* Icon */}
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: accent.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        size={28}
                        color={accent.accent}
                        strokeWidth={1.75}
                      />
                    </View>

                    {/* Text */}
                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        gap: spacing.xs,
                      }}
                    >
                      <ThemedText
                        variant="heading"
                        style={{
                          color: accent.accentText,
                        }}
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
          </View>
        </FadeInUp>
      </View>
    </Screen>
  );
}
