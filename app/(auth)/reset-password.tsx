import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import { Button, Screen, TextField, ThemedText } from "@/components";
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: ResetForm) => {
    setServerError(null);

    const { error } = await supabase.auth.updateUser({
      password: form.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
          <ThemedText variant="title">Password updated</ThemedText>
          <ThemedText muted>
            Your password has been reset successfully. You can now sign in with
            your new password.
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

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
        <ThemedText variant="title">Set new password</ThemedText>
        <ThemedText muted>Enter your new password below.</ThemedText>

        {serverError ? (
          <ThemedText style={{ color: "#dc2626" }}>{serverError}</ThemedText>
        ) : null}

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
    </Screen>
  );
}
