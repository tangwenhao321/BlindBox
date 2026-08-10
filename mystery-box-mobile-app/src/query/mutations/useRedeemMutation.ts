import { useMutation } from "@tanstack/react-query";
import { redeemOrderToBalance } from "../../services/orderService";
import { invalidateOrderQueries } from "../../utils/invalidateAppQueries";

export function useRedeemMutation(token: string) {
  return useMutation({
    mutationFn: (orderId: string) => redeemOrderToBalance(token, orderId),
    onSuccess: () => {
      invalidateOrderQueries(token);
    },
  });
}
