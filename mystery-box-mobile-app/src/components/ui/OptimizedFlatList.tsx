import { forwardRef, useMemo } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  type FlatListProps,
  type ListRenderItem,
  type ListRenderItemInfo,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { isHarmonyLikeDevice } from "../../effects/deviceProfile";

const ITEM_HEIGHT = {
  row: 92,
  card: 172,
} as const;

export type { ListRenderItem, ListRenderItemInfo };

export type OptimizedFlatListProps<T> = FlatListProps<T> & {
  /** Fixed row height hint (FlatList getItemLayout + FlashList estimatedItemSize default). */
  listVariant?: "row" | "card";
  /**
   * FlashList size hint. Defaults from `listVariant` or row height.
   * FlashList v2 ignores estimates but we still pass a stable value for API/compat.
   */
  estimatedItemSize?: number;
  /** FlashList span/layout override when FlashList is active. */
  overrideItemLayout?: (layout: { span?: number; size?: number }, item: T, index: number) => void;
  /** FlashList draw distance when FlashList is active. */
  drawDistance?: number;
  /** Force RN FlatList (nested hosts, experimental layouts). */
  forceFlatList?: boolean;
};

/** Minimal imperative API shared by FlatList and FlashList. */
export type OptimizedListRef<_T = unknown> = {
  scrollToOffset: (params: { offset: number; animated?: boolean | null }) => void;
  scrollToIndex: (params: {
    index: number;
    animated?: boolean | null;
    viewOffset?: number;
    viewPosition?: number;
  }) => void | Promise<void>;
};

/**
 * FlashList only for clearly vertical full-screen lists.
 * Horizontal carousels and lists nested in ScrollView keep FlatList (safer nesting).
 * Harmony-like OEMs and web stay on FlatList for compatibility.
 */
function canUseFlashList(opts: {
  horizontal?: boolean | null;
  forceFlatList?: boolean;
}): boolean {
  if (opts.forceFlatList) return false;
  if (opts.horizontal) return false;
  if (Platform.OS === "web") return false;
  if (isHarmonyLikeDevice()) return false;
  // Test / LAN verify APKs: FlashList has thrown "rendered size is not usable" on some OEMs
  // and surfaces as ErrorBoundary「页面出现问题」. Prefer FlatList until layout is proven stable.
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "test") return false;
  return true;
}

function OptimizedFlatListInner<T>(
  props: OptimizedFlatListProps<T>,
  ref: React.Ref<OptimizedListRef<T>>,
) {
  const {
    listVariant,
    estimatedItemSize: estimatedItemSizeProp,
    overrideItemLayout,
    drawDistance,
    forceFlatList,
    getItemLayout: getItemLayoutProp,
    refreshing,
    onRefresh,
    refreshControl,
    horizontal,
    ...rest
  } = props;

  const estimatedItemSize =
    estimatedItemSizeProp ?? (listVariant ? ITEM_HEIGHT[listVariant] : ITEM_HEIGHT.row);

  const useFlash = canUseFlashList({ horizontal, forceFlatList });

  const getItemLayout = useMemo(() => {
    if (!listVariant) return undefined;
    const size = ITEM_HEIGHT[listVariant];
    return (_data: ArrayLike<T> | null | undefined, index: number) => ({
      length: size,
      offset: size * index,
      index,
    });
  }, [listVariant]);

  if (useFlash) {
    const flashRefreshControl =
      refreshControl ??
      (onRefresh ? (
        <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
      ) : undefined);

    // Strip FlatList-only tuning props FlashList does not support.
    const {
      initialNumToRender: _initialNumToRender,
      maxToRenderPerBatch: _maxToRenderPerBatch,
      windowSize: _windowSize,
      updateCellsBatchingPeriod: _updateCellsBatchingPeriod,
      disableVirtualization: _disableVirtualization,
      onScrollToIndexFailed: _onScrollToIndexFailed,
      ...flashRest
    } = rest;

    // FlashList / FlatList ref shapes differ; callers only use scrollToOffset / scrollToIndex.
    // Cast through unknown: FlashListProps generics + FlatList rest props don't align cleanly.
    const flashProps = {
      ...flashRest,
      ref: ref as never,
      horizontal: false as const,
      // v2 ignores estimates; kept for API compatibility / older FlashList.
      estimatedItemSize,
      drawDistance,
      overrideItemLayout: overrideItemLayout
        ? (layout: { span?: number }, item: unknown, index: number) => {
            overrideItemLayout(layout as { span?: number; size?: number }, item as T, index);
          }
        : undefined,
      refreshControl: flashRefreshControl,
    };
    return <FlashList {...(flashProps as React.ComponentProps<typeof FlashList>)} />;
  }

  return (
    <FlatList
      ref={ref as React.Ref<FlatList<T>>}
      {...rest}
      horizontal={horizontal}
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshControl={refreshControl}
      getItemLayout={getItemLayoutProp ?? getItemLayout}
    />
  );
}

/** Platform-gated FlashList for long vertical lists; FlatList fallback otherwise. */
export const OptimizedFlatList = forwardRef(OptimizedFlatListInner) as <T>(
  props: OptimizedFlatListProps<T> & { ref?: React.Ref<OptimizedListRef<T>> },
) => React.ReactElement;
