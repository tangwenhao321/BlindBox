import { useMutation } from "@tanstack/react-query";
import { toggleFavorite } from "../../services/welfareService";
import { invalidateFavoriteQueries } from "../../utils/invalidateAppQueries";

export function useToggleFavoriteMutation(token: string) {
  return useMutation({
    mutationFn: (mysteryBoxId: string) => toggleFavorite(token, mysteryBoxId),
    onSuccess: () => {
      invalidateFavoriteQueries(token);
    },
  });
}
