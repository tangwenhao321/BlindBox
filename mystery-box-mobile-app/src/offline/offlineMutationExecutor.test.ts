import { beforeEach, describe, expect, it, vi } from "vitest";
import { executePersistedOfflineMutation } from "./offlineMutationExecutor";
import { setSessionAuthToken } from "../utils/authTokenStore";

const mocks = vi.hoisted(() => ({
  saveAddress: vi.fn(),
  createOrder: vi.fn(),
  likePost: vi.fn(),
  applyRefund: vi.fn(),
  exchangeFragment: vi.fn(),
  decomposeOrderItem: vi.fn(),
}));

vi.mock("../services/addressService", () => ({
  saveAddressForUser: mocks.saveAddress,
}));
vi.mock("../services/orderService", () => ({
  createOrder: mocks.createOrder,
  cancelUnpaidOrderById: vi.fn(),
  confirmReceiveOrder: vi.fn(),
  redeemOrderToBalance: vi.fn(),
  mockPayOrder: vi.fn(),
}));
vi.mock("../services/communityService", () => ({
  createCommunityPost: vi.fn(),
  commentCommunityPost: vi.fn(),
  likeCommunityPost: mocks.likePost,
}));
vi.mock("../services/marketplaceService", () => ({
  buyMarketplaceListing: vi.fn(),
  cancelMarketplaceListing: vi.fn(),
}));
vi.mock("../services/feedbackService", () => ({ submitFeedback: vi.fn() }));
vi.mock("../services/refundService", () => ({ applyRefund: mocks.applyRefund }));
vi.mock("../services/fragmentService", () => ({
  exchangeFragmentSku: mocks.exchangeFragment,
  decomposeOrderItem: mocks.decomposeOrderItem,
}));
vi.mock("../services/welfareService", () => ({ toggleFavorite: vi.fn() }));
vi.mock("../services/warehouseShipService", () => ({
  submitWarehouseShip: vi.fn(),
  cancelWarehouseShipRequest: vi.fn(),
}));
vi.mock("../utils/invalidateAppQueries", () => ({
  invalidateAddressQueries: vi.fn(),
  invalidateCouponQueries: vi.fn(),
  invalidateFavoriteQueries: vi.fn(),
  invalidateOrderQueries: vi.fn(),
}));

describe("offlineMutationExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSessionAuthToken("tok");
    mocks.saveAddress.mockResolvedValue(undefined);
    mocks.createOrder.mockResolvedValue("ord-1");
    mocks.likePost.mockResolvedValue({ id: "p1" });
    mocks.applyRefund.mockResolvedValue(undefined);
    mocks.exchangeFragment.mockResolvedValue(undefined);
    mocks.decomposeOrderItem.mockResolvedValue(undefined);
  });

  it("executes saveAddress mutation", async () => {
    await executePersistedOfflineMutation({
      id: "1",
      label: "保存地址",
      kind: "saveAddress",
      token: "tok",
      payload: {
        realName: "张三",
        phoneNumber: "13800138000",
        details: "地址",
        houseNumber: "1",
        top: true,
      },
      createdAt: Date.now(),
    });
    expect(mocks.saveAddress).toHaveBeenCalled();
  });

  it("executes communityLike mutation", async () => {
    await executePersistedOfflineMutation({
      id: "2",
      label: "点赞",
      kind: "communityLike",
      token: "tok",
      payload: { postId: "post-1" },
      createdAt: Date.now(),
    });
    expect(mocks.likePost).toHaveBeenCalledWith("tok", "post-1");
  });

  it("executes applyRefund mutation", async () => {
    await executePersistedOfflineMutation({
      id: "3",
      label: "退款",
      kind: "applyRefund",
      token: "tok",
      payload: { orderId: "ord-1", reason: "test", amount: 10 },
      createdAt: Date.now(),
    });
    expect(mocks.applyRefund).toHaveBeenCalledWith("tok", {
      orderId: "ord-1",
      reason: "test",
      amount: 10,
    });
  });

  it("executes exchangeFragment mutation", async () => {
    await executePersistedOfflineMutation({
      id: "4",
      label: "兑换",
      kind: "exchangeFragment",
      token: "tok",
      payload: { skuId: "sku-1" },
      createdAt: Date.now(),
    });
    expect(mocks.exchangeFragment).toHaveBeenCalledWith("tok", "sku-1", {
      idempotencySeed: "sku-1",
    });
  });

  it("executes decomposeOrderItem mutation", async () => {
    await executePersistedOfflineMutation({
      id: "5",
      label: "分解",
      kind: "decomposeOrderItem",
      token: "tok",
      payload: { orderItemId: "item-1", productId: "prod-1" },
      createdAt: Date.now(),
    });
    expect(mocks.decomposeOrderItem).toHaveBeenCalledWith("tok", "item-1", "prod-1");
  });
});
