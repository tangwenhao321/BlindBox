import { useMutation } from "@tanstack/react-query";
import { createOrder } from "../../services/orderService";
import { invalidateCouponQueries, invalidateOrderQueries } from "../../utils/invalidateAppQueries";

type CreateOrderVariables = {
  boxId: string;
  addressId?: string;
  drawCount: number;
  riskConfirm?: boolean;
  couponUserId?: string;
  drawMode?: import("../../services/orderService").DrawMode;
  slotNo?: number;
};

export function useCreateOrderMutation(token: string) {
  return useMutation({
    mutationFn: (variables: CreateOrderVariables) =>
      createOrder(token, variables.boxId, variables.addressId, variables.drawCount, {
        riskConfirm: variables.riskConfirm,
        couponUserId: variables.couponUserId,
        drawMode: variables.drawMode ?? "instant",
        slotNo: variables.slotNo,
      }),
    onSuccess: (_orderId, variables) => {
      invalidateOrderQueries(token);
      if (variables.couponUserId) {
        invalidateCouponQueries(token);
      }
    },
  });
}
