import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
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
import { useAuthStore } from "@/store/useAuthStore";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { show } = useToast();
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
  });

  const onSubmit = async (form: ProfileForm) => {
    await updateProfile({ full_name: form.fullName, onboarded: true });

    show("Profile saved!", { type: "success" });

    const role = useAuthStore.getState().profile?.role;
    if (role === "teacher") {
      router.replace(Routes.teacher);
    } else if (role === "student") {
      router.replace(Routes.student);
    } else {
      router.replace(Routes.roleSelection);
    }
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
                title="Set up your profile"
                subtitle="Tell us a bit about yourself so your dashboard feels like home."
              />

              <TextField
                label="Full name"
                placeholder="Jane Doe"
                autoCapitalize="words"
                error={errors.fullName?.message}
                onChangeText={(text) =>
                  setValue("fullName", text, { shouldValidate: true })
                }
              />

              <Button
                label="Save & continue"
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
