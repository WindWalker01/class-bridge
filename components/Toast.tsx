import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { radii, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ColorTokens } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

export type ToastOptions = {
  /** Visual tone. Defaults to "info". */
  type?: ToastType;
  /** Auto-dismiss duration in ms. Defaults to 3000. Pass 0 to persist. */
  duration?: number;
};

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Toast Provider
// ---------------------------------------------------------------------------

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Animated values per toast
  const anims = useRef<Map<number, Animated.Value>>(new Map());

  const dismiss = useCallback((id: number) => {
    const anim = anims.current.get(id);
    if (anim) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        anims.current.delete(id);
      });
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, options = {}) => {
      const id = nextId++;
      const type = options.type ?? "info";
      const duration = options.duration ?? 3000;

      const anim = new Animated.Value(0);
      anims.current.set(id, anim);

      // Slide in
      setToasts((prev) => [...prev, { id, message, type }]);
      Animated.spring(anim, {
        toValue: 1,
        stiffness: 200,
        damping: 20,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const context = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={context}>
      {children}

      {/* Toast overlay — fixed at bottom */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          bottom: 80,
          left: spacing.md,
          right: spacing.md,
          gap: spacing.sm,
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => {
          const anim = anims.current.get(toast.id);
          if (!anim) return null;

          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          });

          const toastBg =
            toast.type === "success"
              ? colors.success
              : toast.type === "error"
                ? colors.danger
                : colors.text;

          return (
            <Animated.View
              key={toast.id}
              style={{
                transform: [{ translateY }],
                opacity: anim,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dismiss(toast.id)}
                style={
                  {
                    backgroundColor: toastBg,
                    borderRadius: radii.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 4,
                  } as ViewStyle
                }
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.white, flex: 1 },
                  ]}
                >
                  {toast.message}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `show` function to display a non-blocking toast.
 *
 * ```ts
 * const { show } = useToast();
 * show("Class created!", { type: "success" });
 * ```
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}