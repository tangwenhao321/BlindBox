import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  createMarketplaceListing,
  fetchMarketplaceListings,
  fetchMyMarketplaceListings,
  fetchPurchasedMarketplaceListings,
} from "./marketplaceService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("marketplaceService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("fetches public listings from array response", async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: "listing-1", productName: "Figure A", price: 99 }],
    });
    const rows = await fetchMarketplaceListings(10, "figure", "price_asc", 10, 200, 5);
    expect(rows).toHaveLength(1);
    expect(getMock).toHaveBeenCalledWith("/front/marketplace/listings", {
      params: {
        limit: 10,
        offset: 5,
        keyword: "figure",
        sort: "price_asc",
        minPrice: 10,
        maxPrice: 200,
      },
    });
  });

  it("fetches my listings from wrapped result", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: [{ id: "mine-1", productName: "Mine", price: 50 }] },
    });
    const rows = await fetchMyMarketplaceListings("token-1", 20);
    expect(rows[0]?.id).toBe("mine-1");
    expect(getMock).toHaveBeenCalledWith("/front/marketplace/my-listings", {
      params: { limit: 20 },
      headers: { token: "token-1" },
    });
  });

  it("fetches purchased listings", async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: "buy-1", productName: "Bought", price: 30 }],
    });
    const rows = await fetchPurchasedMarketplaceListings("token-1");
    expect(rows[0]?.productName).toBe("Bought");
  });

  it("creates listing and returns id", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "listing-new" } });
    const id = await createMarketplaceListing("token-1", {
      orderId: "order-1",
      orderItemId: "item-1",
      productId: "prod-1",
      price: 88,
    });
    expect(id).toBe("listing-new");
    expect(postMock).toHaveBeenCalledWith(
      "/front/marketplace/listings",
      { orderId: "order-1", orderItemId: "item-1", productId: "prod-1", price: 88 },
      { headers: { token: "token-1" } },
    );
  });

  it("cancels and buys listings", async () => {
    postMock.mockResolvedValue({ data: {} });
    await cancelMarketplaceListing("token-1", "listing-9");
    await buyMarketplaceListing("token-1", "listing-9");
    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/front/marketplace/listings/listing-9/cancel",
      {},
      { headers: { token: "token-1" } },
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      "/front/marketplace/listings/listing-9/buy",
      {},
      { headers: { token: "token-1" } },
    );
  });
});
