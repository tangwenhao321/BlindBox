import { saveAddressForUser } from "../services/addressService";
import { commentCommunityPost, createCommunityPost, likeCommunityPost } from "../services/communityService";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  createMarketplaceListing,
} from "../services/marketplaceService";
import {
  cancelUnpaidOrderById,
  confirmReceiveOrder,
  createOrder,
  mockPayOrder,
  redeemOrderToBalance,
} from "../services/orderService";
import { submitFeedback } from "../services/feedbackService";
import { applyRefund } from "../services/refundService";
import i18n from "../i18n";
import { exchangeFragmentSku, decomposeOrderItem } from "../services/fragmentService";
import { toggleFavorite } from "../services/welfareService";
import {
  cancelWarehouseShipRequest,
  submitWarehouseShip,
  type ShipLinePayload,
} from "../services/warehouseShipService";
import {
  invalidateAddressQueries,
  invalidateCouponQueries,
  invalidateFavoriteQueries,
  invalidateOrderQueries,
} from "../utils/invalidateAppQueries";
import { getSessionAuthToken } from "../utils/authTokenStore";
import { isIosDigitalGoodsRestricted } from "../utils/iosDigitalGoodsGate";
import type { PersistedOfflineMutation } from "./offlineMutationTypes";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";

function resolveOfflineToken(item: PersistedOfflineMutation): string {
  const session = getSessionAuthToken();
  if (session) return session;
  if (item.token) return item.token;
  throw new Error("offline.missing_auth");
}

const IOS_BLOCKED_KINDS = new Set([
  "redeem",
  "marketplaceBuy",
  "marketplaceList",
  "exchangeFragment",
  "decomposeOrderItem",
]);

export async function executePersistedOfflineMutation(item: PersistedOfflineMutation): Promise<void> {
  const { kind, payload } = item;
  if (kind === "mockPayment" && !MOCK_PAYMENT_ENABLED && !__DEV__) {
    throw new Error("offline.mock_payment_disabled");
  }
  if (
    !__DEV__ &&
    (kind === "createOrder" ||
      kind === "redeem" ||
      kind === "mockPayment" ||
      kind === "marketplaceBuy" ||
      kind === "marketplaceList" ||
      kind === "applyRefund" ||
      kind === "exchangeFragment" ||
      kind === "decomposeOrderItem")
  ) {
    throw new Error("offline.money_kind_disabled");
  }
  if (isIosDigitalGoodsRestricted() && IOS_BLOCKED_KINDS.has(kind)) {
    throw new Error("offline.ios_digital_goods_blocked");
  }
  const token = resolveOfflineToken(item);
  switch (kind) {
    case "saveAddress":
      await saveAddressForUser(token, {
        id: payload.id as string | undefined,
        realName: String(payload.realName ?? ""),
        phoneNumber: String(payload.phoneNumber ?? ""),
        details: String(payload.details ?? ""),
        houseNumber: String(payload.houseNumber ?? ""),
        top: Boolean(payload.top),
      });
      invalidateAddressQueries(token);
      return;
    case "createOrder":
      await createOrder(
        token,
        String(payload.boxId),
        String(payload.addressId),
        Number(payload.drawCount ?? 1),
        {
          riskConfirm: Boolean(payload.riskConfirm),
          couponUserId: payload.couponUserId as string | undefined,
          drawMode: (payload.drawMode as "instant" | "queue" | "buyout") ?? "instant",
          slotNo:
            payload.slotNo != null && Number(payload.slotNo) > 0
              ? Number(payload.slotNo)
              : undefined,
        },
      );
      invalidateOrderQueries(token);
      if (payload.couponUserId) invalidateCouponQueries(token);
      return;
    case "cancelOrder":
      await cancelUnpaidOrderById(token, String(payload.orderId));
      invalidateOrderQueries(token);
      return;
    case "confirmReceive":
      await confirmReceiveOrder(token, String(payload.orderId));
      invalidateOrderQueries(token);
      return;
    case "redeem":
      await redeemOrderToBalance(token, String(payload.orderId));
      invalidateOrderQueries(token);
      return;
    case "mockPayment":
      await mockPayOrder(token, String(payload.orderId), {
        riskConfirm: Boolean(payload.riskConfirm),
      });
      invalidateOrderQueries(token);
      return;
    case "communityPost":
      await createCommunityPost(token, String(payload.content));
      return;
    case "communityComment":
      await commentCommunityPost(token, String(payload.postId), String(payload.content));
      return;
    case "communityLike":
      await likeCommunityPost(token, String(payload.postId));
      return;
    case "marketplaceBuy":
      await buyMarketplaceListing(token, String(payload.listingId));
      return;
    case "marketplaceCancel":
      await cancelMarketplaceListing(token, String(payload.listingId));
      return;
    case "warehouseShipSubmit":
      await submitWarehouseShip(
        token,
        String(payload.addressId),
        payload.items as ShipLinePayload[],
      );
      return;
    case "warehouseShipCancel":
      await cancelWarehouseShipRequest(token, String(payload.requestId));
      return;
    case "toggleFavorite":
      await toggleFavorite(token, String(payload.boxId));
      invalidateFavoriteQueries(token);
      return;
    case "submitFeedback":
      await submitFeedback(
        token,
        String(payload.content),
        payload.pictures as string[] | undefined,
      );
      return;
    case "marketplaceList":
      await createMarketplaceListing(token, {
        orderId: String(payload.orderId),
        orderItemId: String(payload.orderItemId),
        productId: String(payload.productId),
        price: Number(payload.price),
      });
      return;
    case "applyRefund":
      await applyRefund(token, {
        orderId: String(payload.orderId),
        reason: String(payload.reason ?? i18n.t("refunds.defaultReason")),
        amount: Number(payload.amount ?? 0),
      });
      invalidateOrderQueries(token);
      return;
    case "exchangeFragment":
      await exchangeFragmentSku(token, String(payload.skuId), {
        idempotencySeed:
          typeof payload.idempotencySeed === "string" && payload.idempotencySeed
            ? payload.idempotencySeed
            : String(payload.skuId),
      });
      return;
    case "decomposeOrderItem":
      await decomposeOrderItem(token, String(payload.orderItemId), String(payload.productId));
      return;
    default: {
      const unknownKind: never = kind;
      throw new Error(`Unknown offline mutation kind: ${unknownKind}`);
    }
  }
}
