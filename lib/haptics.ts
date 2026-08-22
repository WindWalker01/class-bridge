import * as Haptics from "expo-haptics";

/**
 * Lightweight haptic feedback wrappers.
 * Part C will wire these into interactions across the app.
 */
export const haptics = {
  light: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  warning: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};