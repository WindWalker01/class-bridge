import { Tabs } from "expo-router";
import { ClipboardList, Home, Table2 } from "lucide-react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadows, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { haptics } from "@/lib/haptics";

export default function TeacherTabLayout() {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.xs,
          paddingTop: spacing.xs,
          height:
            (Platform.OS === "ios" ? 64 : 56) +
            (insets.bottom > 0 ? insets.bottom : spacing.xs),
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Classes",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => haptics.light(),
        }}
      />
      <Tabs.Screen
        name="quizzes"
        options={{
          title: "Quizzes",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => haptics.light(),
        }}
      />
      <Tabs.Screen
        name="gradebook"
        options={{
          title: "Gradebook",
          tabBarIcon: ({ color, size }) => <Table2 size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => haptics.light(),
        }}
      />
    </Tabs>
  );
}
