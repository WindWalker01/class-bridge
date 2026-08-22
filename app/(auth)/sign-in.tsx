import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import {
  Button,
  FadeInUp,
  Screen,
  TextField,
  ThemedText,
  useToast,
} from "@/components";
import { appConfig } from "@/constants/config";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: SignInForm) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid email or password")
      ) {
        show("Invalid email or password. Please try again.", { type: "error" });
      } else if (msg.includes("email not confirmed")) {
        show(
          "Please confirm your email address before signing in. Check your inbox.",
          { type: "error" },
        );
      } else {
        show(error.message, { type: "error" });
      }
      return;
    }

    router.replace(Routes.index);
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <FadeInUp>
          <View style={{ gap: spacing.md }}>
            <ThemedText variant="display">{appConfig.name}</ThemedText>
            <ThemedText muted>Sign in to continue.</ThemedText>

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

            <Button
              label="Sign In"
              fullWidth
              loading={isSubmitting}
              onPress={() => void handleSubmit(onSubmit)()}
            />

            <Button
              variant="ghost"
              label="Don't have an account? Sign up"
              onPress={() => router.replace(Routes.signUp)}
            />
          </View>
        </FadeInUp>
      </View>
    </Screen>
  );
}
