import { forwardRef, useMemo } from "react";
import {
  FlatList,
  type FlatListProps,
  type ListRenderItem,
  type ListRenderItemInfo,
} from "react-native";

const ITEM_HEIGHT = {
  row: 92,
  card: 172,
} as const;

export type { ListRenderItem, ListRenderItemInfo };

export type OptimizedFlatListProps<T> = FlatListProps<T> & {
  /** Fixed row height hint (improves scroll perf on long lists). */
  listVariant?: "row" | "card";
  /** Ignored — kept for API compatibility with FlashList callers. */
  overrideItemLayout?: (layout: { span?: number; size?: number }, item: T, index: number) => void;
  /** Ignored — kept for API compatibility with FlashList callers. */
  drawDistance?: number;
};

export type OptimizedListRef<T> = FlatList<T>;

function OptimizedFlatListInner<T>(
  props: OptimizedFlatListProps<T>,
  ref: React.Ref<OptimizedListRef<T>>,
) {
  const { listVariant, overrideItemLayout: _overrideItemLayout, drawDistance: _drawDistance, ...rest } = props;

  const getItemLayout = useMemo(() => {
    if (!listVariant) return undefined;
    const size = ITEM_HEIGHT[listVariant];
    return (_data: ArrayLike<T> | null | undefined, index: number) => ({
      length: size,
      offset: size * index,
      index,
    });
  }, [listVariant]);

  return (
    <FlatList
      ref={ref}
      {...rest}
      getItemLayout={rest.getItemLayout ?? getItemLayout}
    />
  );
}

/** Uses React Native FlatList for broad HarmonyOS / legacy device compatibility. */
export const OptimizedFlatList = forwardRef(OptimizedFlatListInner) as <T>(
  props: OptimizedFlatListProps<T> & { ref?: React.Ref<OptimizedListRef<T>> },
) => React.ReactElement;
