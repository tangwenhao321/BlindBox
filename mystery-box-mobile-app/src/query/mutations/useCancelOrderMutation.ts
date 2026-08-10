import { useMutation } from "@tanstack/react-query";
import { cancelUnpaidOrderById } from "../../services/orderService";
import { invalidateOrderQueries } from "../../utils/invalidateAppQueries";

export function useCancelOrderMutation(token: string) {
  return useMutation({
    mutationFn: (orderId: string) => cancelUnpaidOrderById(token, orderId),
    onSuccess: () => {
      invalidateOrderQueries(token);
    },
  });
}
