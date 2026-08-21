import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

import { Button, Screen, ThemedText } from "@/components";
import { colors, radii, spacing } from "@/constants/theme";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [serverError, setServerError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const isOtpComplete = otp.every((digit) => digit !== "");

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setServerError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!isOtpComplete || !email) return;
    setVerifying(true);
    setServerError(null);
    const token = otp.join("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (error) {
      setServerError(error.message);
      setVerifying(false);
      return;
    }
    router.replace(Routes.resetPassword);
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setResending(true);
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setServerError(error.message);
      setResending(false);
      return;
    }
    setOtp(Array(OTP_LENGTH).fill(""));
    setResendCooldown(RESEND_COOLDOWN);
    setResending(false);
    inputRefs.current[0]?.focus();
  };

  if (!email) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.md }}>
          <ThemedText variant="title">Missing email</ThemedText>
          <ThemedText muted>
            No email address provided. Please go back and try again.
          </ThemedText>
          <Button
            label="Go back"
            fullWidth
            onPress={() => router.replace(Routes.forgotPassword)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title">Check your email</ThemedText>
          <ThemedText muted>
            We sent a 6-digit code to{" "}
            <ThemedText style={{ fontWeight: "600" }}>{email}</ThemedText>.
            Enter it below to reset your password.
          </ThemedText>
        </View>
{serverError ? (
          <ThemedText style={{ color: colors.danger }}>{serverError}</ThemedText>
        ) : null}

        {/* OTP Input Row */}
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            justifyContent: "center",
          }}
        >
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={otp[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={1}
              selectTextOnFocus
              style={{
                width: 48,
                height: 56,
                borderWidth: 2,
                borderColor: otp[index] ? colors.primary : colors.border,
                borderRadius: radii.md,
                textAlign: "center",
                fontSize: 24,
                fontWeight: "700",
                color: colors.text,
                backgroundColor: otp[index]
                  ? colors.primaryMuted
                  : "transparent",
              }}
            />
          ))}
        </View>

        <Button
          label="Verify code"
          fullWidth
          loading={verifying}
          disabled={!isOtpComplete || verifying}
          onPress={() => void handleVerify()}
        />

        {/* Resend section */}
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <ThemedText muted>Didn't receive the code?</ThemedText>
          {resendCooldown > 0 ? (
            <ThemedText
              style={{
                color: colors.textMuted,
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              Resend available in {resendCooldown}s
            </ThemedText>
          ) : (
            <Button
              variant="ghost"
              label="Resend code"
              loading={resending}
              disabled={resending}
              onPress={() => void handleResend()}
            />
          )}
        </View>

        <Button
          variant="ghost"
          label="Back to sign in"
          onPress={() => router.replace(Routes.signIn)}
        />
      </View>
    </Screen>
  );
}