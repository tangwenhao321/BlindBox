import type { ReactElement } from "react";

/** Hide empty state when a load error banner is shown above the list. */
export function listEmptyWhenOk(loadError: string | null, empty: ReactElement | null): ReactElement | null {
  if (loadError) return null;
  return empty;
}

/** First paint: show skeleton instead of empty list or spinner. */
export function shouldShowListSkeleton(
  loading: boolean,
  itemCount: number,
  loadError?: string | null,
  refreshing?: boolean,
): boolean {
  return loading && itemCount === 0 && !loadError && !refreshing;
}
