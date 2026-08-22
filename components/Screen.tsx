import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type ScreenProps = PropsWithChildren<{
  /** Uses a safe-area container by default; disable for nested screens. */
  safeArea?: boolean;
}> &
  ViewProps;

/**
 * Base screen container. Wraps children in a padded, safe-area-aware view so
 * every route starts from the same layout baseline.
 */
export function Screen({
  safeArea = true,
  style,
  children,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const content = (
    <View
      style={[
        { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (!safeArea) return content;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right", "bottom"]}
    >
      {content}
    </SafeAreaView>
  );
}
