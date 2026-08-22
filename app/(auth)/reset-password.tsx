import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { z } from "zod";

import {
  Button,
  FadeInUp,
  Screen,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Verify that we have a valid session (set by OTP verification)
  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setSessionError(
          "No active session. Please request a new password reset code.",
        );
      }

      setCheckingSession(false);
    }

    void checkSession();
  }, []);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: ResetForm) => {
    const { error } = await supabase.auth.updateUser({
      password: form.password,
    });

    if (error) {
      show(error.message, { type: "error" });
      return;
    }

    show("Password updated! You can now sign in with your new password.", {
      type: "success",
    });
    router.replace(Routes.signIn);
  };

  if (checkingSession) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
          <ThemedText variant="title">Checking session...</ThemedText>
          <ThemedText muted>Please wait a moment.</ThemedText>
        </View>
      </Screen>
    );
  }

  if (sessionError) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
          <ThemedText variant="title">Session expired</ThemedText>
          <ThemedText muted>{sessionError}</ThemedText>
          <Button
            label="Request new reset code"
            fullWidth
            onPress={() => router.replace(Routes.forgotPassword)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <FadeInUp>
            <View style={{ gap: spacing.md }}>
              <ThemedText variant="title">Set new password</ThemedText>
              <ThemedText muted>Enter your new password below.</ThemedText>

              <TextField
                label="New password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                error={errors.password?.message}
                onChangeText={(text) =>
                  setValue("password", text, { shouldValidate: true })
                }
              />
              <Button
                variant="ghost"
                label={showPassword ? "Hide password" : "Show password"}
                onPress={() => setShowPassword((prev) => !prev)}
              />

              <TextField
                label="Confirm new password"
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                error={errors.confirmPassword?.message}
                onChangeText={(text) =>
                  setValue("confirmPassword", text, { shouldValidate: true })
                }
              />
              <Button
                variant="ghost"
                label={showConfirm ? "Hide password" : "Show password"}
                onPress={() => setShowConfirm((prev) => !prev)}
              />

              <Button
                label="Reset password"
                fullWidth
                loading={isSubmitting}
                disabled={!isValid}
                onPress={() => void handleSubmit(onSubmit)()}
              />
            </View>
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
