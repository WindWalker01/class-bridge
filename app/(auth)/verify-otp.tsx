import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  Badge,
  Button,
  FadeInUp,
  Screen,
  ThemedText,
  useToast,
} from "@/components";
import { colors, radii, spacing } from "@/constants/theme";
import { haptics } from "@/lib/haptics";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

// ---------------------------------------------------------------------------
// Animated OTP Cell
// ---------------------------------------------------------------------------

function OtpCell({
  value,
  onChangeText,
  onKeyPress,
  inputRef,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  inputRef: (ref: TextInput | null) => void;
  autoFocus?: boolean;
}) {
  const filled = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    filled.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, filled]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(
      filled.value === 1 ? colors.primary : colors.border,
      { duration: 200 },
    ),
    backgroundColor: withTiming(
      filled.value === 1 ? colors.primaryMuted : "transparent",
      { duration: 200 },
    ),
  }));

  return (
    <Animated.View style={[{ borderRadius: radii.md, overflow: "hidden" }, animatedStyle]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={1}
        selectTextOnFocus
        autoFocus={autoFocus}
        style={{
          width: 48,
          height: 56,
          borderWidth: 2,
          borderRadius: radii.md,
          textAlign: "center",
          fontSize: 24,
          fontWeight: "700",
          color: colors.text,
        }}
      />
    </Animated.View>
  );
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { show } = useToast();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
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

    const token = otp.join("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    if (error) {
      show(error.message, { type: "error" });
      setVerifying(false);
      return;
    }

    haptics.success();
    router.replace(Routes.resetPassword);
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setResending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      show(error.message, { type: "error" });
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <FadeInUp>
            <View style={{ gap: spacing.lg }}>
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="title">Check your email</ThemedText>
                <ThemedText muted>
                  We sent a 6-digit code to{" "}
                  <ThemedText style={{ fontWeight: "600" }}>{email}</ThemedText>.
                  Enter it below to reset your password.
                </ThemedText>
              </View>

              {/* OTP Input Row */}
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing.sm,
                  justifyContent: "center",
                }}
              >
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                  <OtpCell
                    key={index}
                    value={otp[index]}
                    inputRef={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    autoFocus={index === 0}
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
                  <Badge
                    label={`Resend available in ${resendCooldown}s`}
                    tone="neutral"
                    size="sm"
                  />
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
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}