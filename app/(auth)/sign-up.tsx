import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { z } from "zod";

import { Button, FadeInUp, Screen, TextField, ThemedText, useToast } from "@/components";
import { appConfig } from "@/constants/config";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const signUpSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
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

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: SignUpForm) => {
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        show("An account with this email already exists.", { type: "error" });
      } else {
        show(error.message, { type: "error" });
      }
      return;
    }

    show("Account created!", { type: "success" });
    router.replace(Routes.roleSelection);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <FadeInUp>
            <View style={{ gap: spacing.md }}>
              <ThemedText variant="display">{appConfig.name}</ThemedText>
              <ThemedText muted>Create your account to get started.</ThemedText>

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

              <TextField
                label="Password"
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
                label="Confirm password"
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
                label="Sign Up"
                fullWidth
                loading={isSubmitting}
                disabled={!isValid}
                onPress={() => void handleSubmit(onSubmit)()}
              />

              <Button
                variant="ghost"
                label="Already have an account? Sign in"
                onPress={() => router.replace(Routes.signIn)}
              />
            </View>
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
