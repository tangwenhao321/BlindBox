import { useMutation } from "@tanstack/react-query";
import { confirmReceiveOrder } from "../../services/orderService";
import { invalidateOrderQueries } from "../../utils/invalidateAppQueries";

export function useConfirmReceiveMutation(token: string) {
  return useMutation({
    mutationFn: (orderId: string) => confirmReceiveOrder(token, orderId),
    onSuccess: () => {
      invalidateOrderQueries(token);
    },
  });
}
