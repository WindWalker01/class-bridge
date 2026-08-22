import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, type Href } from "expo-router";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { z } from "zod";

import {
  AuthHeader,
  Button,
  FadeInUp,
  Screen,
  TextField,
  useToast,
} from "@/components";
import { spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: ForgotForm) => {
    const { error } = await supabase.auth.resetPasswordForEmail(form.email);

    if (error) {
      show(error.message, { type: "error" });
      return;
    }

    show("Reset code sent! Check your email.", { type: "success" });

    // Navigate to OTP verification screen
    router.push(
      `/(auth)/verify-otp?email=${encodeURIComponent(form.email)}` as Href,
    );
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
              <AuthHeader
                title="Forgot password?"
                subtitle="Enter your email address and we'll send you a 6-digit code to reset your password."
              />

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
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
