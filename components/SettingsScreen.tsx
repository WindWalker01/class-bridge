/**
 * Shared Settings / Profile screen used by both (teacher) and (student) route
 * groups.  Accepts a `role` prop so role-specific accent colours and the
 * correct sign-out redirect are applied from a single component.
 *
 * Sections:
 *   1. Profile  - avatar (tappable to change), display name (editable), email,
 *                 role badge
 *   2. Account  - change password, sign out
 *   3. Preferences - placeholder section ready for Part F's theme toggle
 */
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FadeInUp } from "@/components/animations/entry";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { ThemedText } from "@/components/ThemedText";
import { useToast } from "@/components/Toast";
import { usePressAnimation } from "@/components/animations";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/hooks/useTheme";
import { radii, spacing } from "@/constants/theme";
import { haptics } from "@/lib/haptics";
import { Routes } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/types";
import {
  ChevronRight,
  KeyRound,
  LogOut,
  Star,
  User,
} from "lucide-react-native";
import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SettingsScreenProps = {
  role: Role;
};

// ---------------------------------------------------------------------------
// SettingsScreen
// ---------------------------------------------------------------------------

export default function SettingsScreen({ role }: SettingsScreenProps) {
  const { colors, accent, mode, setMode } = useTheme();
  const { show: showToast } = useToast();

  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const signOut = useAuthStore((state) => state.signOut);
  // -----------------------------------------------------------------------
  // Profile editing state
  // -----------------------------------------------------------------------
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);

  // -----------------------------------------------------------------------
  // Password change state
  // -----------------------------------------------------------------------
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  /** Pick an image from the library and upload to Supabase Storage. */
  const handleChangeAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      haptics.light();

      const uri = result.assets[0].uri;
      const userId = user?.id;
      if (!userId) return;

      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        showToast("Failed to upload avatar", { type: "error" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        await updateProfile({ avatar_url: urlData.publicUrl });
        showToast("Avatar updated", { type: "success" });
      }
    } catch {
      showToast("Could not change avatar", { type: "error" });
    }
  }, [user?.id, updateProfile, showToast]);
  /** Save the edited display name. */
  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === profile?.full_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ full_name: trimmed });
      showToast("Profile updated", { type: "success" });
      setEditingName(false);
    } catch {
      showToast("Failed to update name", { type: "error" });
    } finally {
      setSavingName(false);
    }
  }, [nameValue, profile?.full_name, updateProfile, showToast]);

  /** Change password via Supabase Auth. */
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Please fill in all password fields", { type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", {
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", { type: "error" });
      return;
    }

    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? "",
        password: currentPassword,
      });

      if (signInError) {
        showToast("Current password is incorrect", { type: "error" });
        setSavingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        showToast("Failed to change password", { type: "error" });
        return;
      }

      showToast("Password changed successfully", { type: "success" });
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Something went wrong", { type: "error" });
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, user?.email, showToast]);
  /** Sign out with confirmation dialog. */
  const handleSignOut = useCallback(() => {
    haptics.warning();
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  // -----------------------------------------------------------------------
  // Shared animated press handler for setting rows
  // -----------------------------------------------------------------------
  const SettingRow = ({
    icon: Icon,
    label,
    subtitle,
    onPress,
  }: {
    icon: typeof User;
    label: string;
    subtitle?: string;
    onPress: () => void;
  }) => {
    const { animatedStyle, pressIn, pressOut } = usePressAnimation({
      hapticOnPress: true,
    });
    return (
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingVertical: spacing.sm + 2,
            ...(animatedStyle as any),
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: accent.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color={accent.accentText} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: "500" }}>
              {label}
            </ThemedText>
            {subtitle ? (
              <ThemedText variant="small" muted>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <ChevronRight
            size={18}
            color={colors.textSubtle}
            strokeWidth={1.8}
          />
        </Animated.View>
      </Pressable>
    );
  };
  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: spacing.xxl + 40,
            gap: spacing.lg,
          }}
        >
          {/* -- Screen header -- */}
          <FadeInUp>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingTop: spacing.lg,
                paddingBottom: spacing.md,
                gap: spacing.md,
              }}
            >
              <IconButton
                icon={require("lucide-react-native").ArrowLeft}
                onPress={() => router.back()}
                color={colors.text}
                size={24}
              />
              <ThemedText variant="heading">Settings</ThemedText>
            </View>
          </FadeInUp>

          {/* -- Profile section -- */}
          <FadeInUp delay={50}>
            <Card variant="elevated" padding="lg">
              {/* Avatar row */}
              <View style={{ alignItems: "center", gap: spacing.sm }}>
                <Pressable
                  onPress={handleChangeAvatar}
                  accessibilityLabel="Change avatar photo"
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      position: "relative",
                    }}
                  >
                    <Avatar
                      uri={profile?.avatar_url}
                      name={profile?.full_name ?? "User"}
                      size={80}
                    />
                    {/* Edit overlay */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: -2,
                        backgroundColor: accent.accent,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: colors.white,
                      }}
                    >
                      <User size={14} color={colors.white} strokeWidth={2.5} />
                    </View>
                  </View>
                </Pressable>
                <ThemedText variant="caption" muted>
                  Tap to change photo
                </ThemedText>
              </View>
              {/* Name editing */}
              {editingName ? (
                <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                  <TextField
                    label="Display name"
                    value={nameValue}
                    onChangeText={setNameValue}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      gap: spacing.sm,
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => {
                        setNameValue(profile?.full_name ?? "");
                        setEditingName(false);
                      }}
                    />
                    <Button
                      label="Save"
                      loading={savingName}
                      onPress={() => void handleSaveName()}
                      disabled={!nameValue.trim()}
                    />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setNameValue(profile?.full_name ?? "");
                    setEditingName(true);
                    haptics.light();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: spacing.xs,
                    marginTop: spacing.sm,
                  }}
                >
                  <ThemedText variant="title">
                    {profile?.full_name ?? "Set your name"}
                  </ThemedText>
                  <User size={16} color={colors.textMuted} strokeWidth={1.8} />
                </Pressable>
              )}

              {/* Email (read-only) */}
              <View style={{ alignItems: "center", marginTop: spacing.xs }}>
                <ThemedText variant="caption" muted>
                  {user?.email ?? ""}
                </ThemedText>
              </View>

              {/* Role badge */}
              <View style={{ alignItems: "center", marginTop: spacing.sm }}>
                <Badge
                  label={role === "teacher" ? "Teacher" : "Student"}
                  tone={role === "teacher" ? "accent" : "success"}
                />
              </View>
            </Card>
          </FadeInUp>
          {/* -- Account actions -- */}
          <FadeInUp delay={100}>
            <Card variant="elevated" padding="md">
              <ThemedText variant="heading" style={{ marginBottom: spacing.sm }}>
                Account
              </ThemedText>

              {/* Change Password */}
              {changingPassword ? (
                <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                  <TextField
                    label="Current password"
                    placeholder="��������"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TextField
                    label="New password"
                    placeholder="At least 6 characters"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TextField
                    label="Confirm new password"
                    placeholder="Re-enter new password"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      gap: spacing.sm,
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => {
                        setChangingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    />
                    <Button
                      label="Change"
                      loading={savingPassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword}
                      onPress={() => void handleChangePassword()}
                    />
                  </View>
                </View>
              ) : (
                <SettingRow
                  icon={KeyRound}
                  label="Change Password"
                  subtitle="Update your account password"
                  onPress={() => {
                    haptics.light();
                    setChangingPassword(true);
                  }}
                />
              )}

              {/* Separator */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: spacing.sm,
                }}
              />

              {/* Sign Out */}
              <SettingRow
                icon={LogOut}
                label="Sign Out"
                subtitle="Sign out of your account"
                onPress={handleSignOut}
              />
            </Card>
          </FadeInUp>
          {/* -- Preferences (placeholder for Part F) -- */}
          <FadeInUp delay={150}>
            <Card variant="elevated" padding="md">
              <ThemedText variant="heading" style={{ marginBottom: spacing.sm }}>
                Preferences
              </ThemedText>

{/* Theme Toggle */}
              <ThemedText variant="small" muted style={{ marginBottom: spacing.sm }}>
                Appearance
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                }}
              >
                {(["system", "light", "dark"] as ThemeMode[]).map((opt) => {
                  const isActive = mode === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        haptics.light();
                        setMode(opt);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm + 2,
                        alignItems: "center",
                        backgroundColor: isActive
                          ? accent.accentSoft
                          : "transparent",
                      }}
                    >
                      <ThemedText
                        variant="small"
                        style={{
                          fontWeight: "600",
                          color: isActive
                            ? accent.accentText
                            : colors.textMuted,
                          textTransform: "capitalize",
                        }}
                      >
                        {opt}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              {/* Theme Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  paddingVertical: spacing.sm + 2,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: accent.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star
                    size={20}
                    color={accent.accentText}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: "500" }}>
                    Theme
                  </ThemedText>
                  <ThemedText variant="small" muted>
                    System / Light / Dark
                  </ThemedText>
                </View>
              </View>
            </Card>
          </FadeInUp>

          {/* -- App info -- */}
          <FadeInUp delay={200}>
            <View style={{ alignItems: "center", paddingTop: spacing.md }}>
              <ThemedText variant="small" muted>
                Class Bridge
              </ThemedText>
            </View>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

