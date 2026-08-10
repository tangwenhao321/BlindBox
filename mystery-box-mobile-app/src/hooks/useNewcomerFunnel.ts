import { useCallback, useState } from "react";
import { getNewcomerOfferBox } from "../services/boxService";

type Params = {
  token: string;
  visible: boolean;
  onOpenBox: (boxId: string, drawCount: number) => void;
};

export function useNewcomerFunnel({ token, visible, onOpenBox }: Params) {
  const [loading, setLoading] = useState(false);

  const startFirstDraw = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const box = await getNewcomerOfferBox(token);
      if (box?.id) {
        onOpenBox(box.id, 1);
      }
    } finally {
      setLoading(false);
    }
  }, [token, onOpenBox]);

  return { loading, startFirstDraw, shouldPrompt: visible };
}
