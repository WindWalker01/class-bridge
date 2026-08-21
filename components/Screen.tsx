import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const content = (
    <View className="flex-1 bg-white px-5" style={style} {...rest}>
      {children}
    </View>
  );

  if (!safeArea) return content;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      {content}
    </SafeAreaView>
  );
}
