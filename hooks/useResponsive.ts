import { useWindowDimensions } from "react-native";

/**
 * Breakpoint booleans derived from the current window dimensions.
 *
 * - `isTablet`: width >= 768 (iPad portrait, small landscape tablets).
 * - `isLandscape`: width > height.
 * - `isPhonePortrait`: the inverse — width < 768 and height >= width.
 * - `width`, `height`: raw dimension values for custom branching.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return {
    isTablet: width >= 768,
    isLandscape: width > height,
    isPhonePortrait: width < 768 && height >= width,
    width,
    height,
  };
}

/** Convenience: returns 2 for tablet width columns, undefined for phone. */
export function gridColumns(isTablet: boolean): 2 | undefined {
  return isTablet ? 2 : undefined;
}

/** Convenience: returns a max-width style object for form screens on tablet. */
export function formMaxWidth(isTablet: boolean) {
  return isTablet
    ? ({ maxWidth: 520, alignSelf: "center", width: "100%" } as const)
    : undefined;
}