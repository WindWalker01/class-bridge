import { useCallback, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { spacing } from "@/constants/theme";
import type { Question } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RenderQuestionFn = (
  question: Question,
  index: number,
  isDragging: boolean,
) => React.ReactNode;

export interface DraggableQuestionListProps {
  questions: Question[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: RenderQuestionFn;
  /** Called with `true`/`false` so parent can disable ScrollView while dragging. */
  onScrollChange?: (enabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// Gap constant
// ---------------------------------------------------------------------------

const GAP = spacing.md;

/** Default card-step for visual displacement when measured height isn't available yet. */
const CARD_STEP = 180;

// ---------------------------------------------------------------------------
// DraggableQuestionList
// ---------------------------------------------------------------------------

export default function DraggableQuestionList({
  questions,
  onReorder,
  renderItem,
  onScrollChange,
}: DraggableQuestionListProps) {
  // Internal order state
  const [order, setOrder] = useState<string[]>(() =>
    questions.map((q) => q.id),
  );

  // Refs kept fresh for worklet access
  const orderRef = useRef(order);
  const onReorderRef = useRef(onReorder);
  const onScrollChangeRef = useRef(onScrollChange);
  orderRef.current = order;
  onReorderRef.current = onReorder;
  onScrollChangeRef.current = onScrollChange;

  // Synch order when questions change
  const prevIdsRef = useRef<string | null>(null);
  const currentIds = questions.map((q) => q.id).join(",");
  if (prevIdsRef.current !== currentIds) {
    prevIdsRef.current = currentIds;
    setOrder(questions.map((q) => q.id));
  }

  // Measured item heights for accurate step calculation
  const itemHeights = useRef<number[]>([]);

  const captureHeight = useCallback(
    (index: number, evt: LayoutChangeEvent) => {
      itemHeights.current[index] = evt.nativeEvent.layout.height;
    },
    [],
  );

  // Reanimated shared values (worklet-safe drag state)
  const dragStartIndex = useSharedValue(-1);
  const dragTranslationY = useSharedValue(0);
  const orderLengthSV = useSharedValue(order.length);
  // Keep synced
  orderLengthSV.value = order.length;

  // JS-thread callbacks
  const onDragStart = useCallback(
    (index: number) => {
      dragStartIndex.value = index;
      dragTranslationY.value = 0;
      onScrollChangeRef.current?.(false);
    },
    [dragStartIndex, dragTranslationY],
  );

  const onDragEnd = useCallback(
    (translationY: number) => {
      const fromIndex = dragStartIndex.value;
      dragStartIndex.value = -1;
      dragTranslationY.value = withSpring(0, { stiffness: 300, damping: 25 });
      onScrollChangeRef.current?.(true);

      if (fromIndex < 0) return;

      const step = itemHeights.current[fromIndex] ?? CARD_STEP;
      const shift = Math.round(translationY / (step + GAP));
      if (shift === 0) return;

      const toIndex = Math.max(
        0,
        Math.min(orderRef.current.length - 1, fromIndex + shift),
      );
      if (toIndex === fromIndex) return;

      const newOrder = [...orderRef.current];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);

      setOrder(newOrder);
      onReorderRef.current(newOrder);
    },
    [dragStartIndex, dragTranslationY],
  );

  const onDragCancel = useCallback(() => {
    dragStartIndex.value = -1;
    dragTranslationY.value = withSpring(0, { stiffness: 300, damping: 25 });
    onScrollChangeRef.current?.(true);
  }, [dragStartIndex, dragTranslationY]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View style={{ gap: GAP }}>
      {order.map((id, index) => {
        const question = questions.find((q) => q.id === id);
        if (!question) return null;

        const itemPan = Gesture.Pan()
          .activateAfterLongPress(300)
          .onStart(() => {
            "worklet";
            runOnJS(onDragStart)(index);
          })
          .onUpdate((event) => {
            "worklet";
            // Only the matching item updates the shared value
            if (dragStartIndex.value === index) {
              dragTranslationY.value = event.translationY;
            }
          })
          .onEnd((event) => {
            "worklet";
            if (dragStartIndex.value === index) {
              runOnJS(onDragEnd)(event.translationY);
            }
          })
          .onFinalize(() => {
            "worklet";
            // Safety: clean up if gesture was cancelled mid-drag
            if (dragStartIndex.value >= 0) {
              runOnJS(onDragCancel)();
            }
          });

        return (
          <DraggableItem
            key={id}
            gesture={itemPan}
            currentIndex={index}
            dragStartIndex={dragStartIndex}
            dragTranslationY={dragTranslationY}
            orderLengthSV={orderLengthSV}
            onLayout={(evt) => captureHeight(index, evt)}
          >
            {renderItem(
              question,
              index,
              dragStartIndex.value === index,
            )}
          </DraggableItem>
        );
      })}
    </View>
  );
}

interface DraggableItemProps {
  gesture: ReturnType<typeof Gesture.Pan>;
  currentIndex: number;
  dragStartIndex: SharedValue<number>;
  dragTranslationY: SharedValue<number>;
  orderLengthSV: SharedValue<number>;
  onLayout: (evt: LayoutChangeEvent) => void;
  children: React.ReactNode;
}

function DraggableItem({
  gesture,
  currentIndex,
  dragStartIndex,
  dragTranslationY,
  orderLengthSV,
  onLayout,
  children,
}: DraggableItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const startIdx = dragStartIndex.value;

    // Not dragging at all -> no offset
    if (startIdx < 0) return { transform: [{ translateY: 0 }], opacity: 1 };

    const isDraggedItem = currentIndex === startIdx;
    const shift = Math.round(dragTranslationY.value / (CARD_STEP + GAP));

    // The dragged item follows the finger
    if (isDraggedItem) {
      return {
        transform: [{ translateY: dragTranslationY.value }],
        zIndex: 999,
        elevation: 8,
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        opacity: 0.95,
      };
    }

    // No shift -> no displacement
    if (shift === 0) return { transform: [{ translateY: 0 }], opacity: 1 };

    // Clamp drop index so it stays within valid range
    const len = orderLengthSV.value;
    const dropIdx = Math.max(0, Math.min(len - 1, startIdx + shift));

    // Items between start and drop shift to make room
    if (shift > 0 && currentIndex > startIdx && currentIndex <= dropIdx) {
      // Dragging down: items below start shift up
      return { transform: [{ translateY: -(CARD_STEP + GAP) }], opacity: 1 };
    }
    if (shift < 0 && currentIndex >= dropIdx && currentIndex < startIdx) {
      // Dragging up: items above start shift down
      return { transform: [{ translateY: CARD_STEP + GAP }], opacity: 1 };
    }

    return { transform: [{ translateY: 0 }], opacity: 1 };
  }, [currentIndex]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View onLayout={onLayout} style={animatedStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}