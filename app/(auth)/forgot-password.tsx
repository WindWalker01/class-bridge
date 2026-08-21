import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import { Button, Screen, TextField, ThemedText } from "@/components";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: ForgotForm) => {
    setServerError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(form.email);

    if (error) {
      setServerError(error.message);
      return;
    }

    // Navigate to OTP verification screen
    router.push(
      `/(auth)/verify-otp?email=${encodeURIComponent(form.email)}` as Href,
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <ThemedText variant="title">Forgot password?</ThemedText>
        <ThemedText muted>
          Enter your email address and we'll send you a 6-digit code to reset
          your password.
        </ThemedText>

        {serverError ? (
          <ThemedText style={{ color: "#dc2626" }}>{serverError}</ThemedText>
        ) : null}

        <TextField
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email?.message}
          onChangeText={(text) =>
            setValue("email", text, { shouldValidate: true })
          }
        />

        <Button
          label="Send reset code"
          fullWidth
          loading={isSubmitting}
          disabled={!isValid}
          onPress={() => void handleSubmit(onSubmit)()}
        />

        <Button
          variant="ghost"
          label="Back to sign in"
          onPress={() => router.replace(Routes.signIn)}
        />
      </View>
    </Screen>
  );
}
