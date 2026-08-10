import { describe, expect, it } from "vitest";
import {
  fetchAddressesQuery,
  fetchCouponsQuery,
  fetchFavoriteIdsQuery,
  fetchHomeBoxesPage,
  fetchMallBoxesPage,
  fetchNotificationsQuery,
  fetchOrdersPage,
} from "./fetchers";

describe("query fetchers", () => {
  it("exports query fetcher functions", () => {
    expect(typeof fetchCouponsQuery).toBe("function");
    expect(typeof fetchFavoriteIdsQuery).toBe("function");
    expect(typeof fetchNotificationsQuery).toBe("function");
    expect(typeof fetchHomeBoxesPage).toBe("function");
    expect(typeof fetchMallBoxesPage).toBe("function");
    expect(typeof fetchOrdersPage).toBe("function");
    expect(typeof fetchAddressesQuery).toBe("function");
  });
});
