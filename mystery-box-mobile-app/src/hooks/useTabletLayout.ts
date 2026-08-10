import { useWindowDimensions } from "react-native";

export const TABLET_MIN_WIDTH = 600;

export function useTabletLayout(breakpoint = TABLET_MIN_WIDTH) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= breakpoint;
  const columns = isTablet ? 2 : 1;
  const contentMaxWidth = isTablet ? Math.min(720, width - 48) : width;
  return { width, height, isTablet, columns, contentMaxWidth, breakpoint };
}
