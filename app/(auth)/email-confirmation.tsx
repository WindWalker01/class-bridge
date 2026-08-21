import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button, Screen, ThemedText } from "@/components";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";

export default function EmailConfirmationScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <ThemedText variant="title">Check your email</ThemedText>
        <ThemedText muted>
          We've sent a confirmation link to your email address. Please check
          your inbox and click the link to verify your account before signing
          in.
        </ThemedText>
        <Button
          label="Go to sign in"
          fullWidth
          onPress={() => router.replace(Routes.signIn)}
        />
      </View>
    </Screen>
  );
}
