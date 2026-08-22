/**
 * PasswordField — TextField with an inline show/hide password toggle.
 */
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { TextField } from "@/components/TextField";

type PasswordFieldProps = Omit<
  React.ComponentProps<typeof TextField>,
  "rightSlot" | "secureTextEntry"
>;

export function PasswordField(props: PasswordFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const EyeIcon = visible ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          hitSlop={12}
          onPress={() => setVisible((prev) => !prev)}
        >
          <EyeIcon size={20} color={colors.textMuted} strokeWidth={1.8} />
        </Pressable>
      }
    />
  );
}
