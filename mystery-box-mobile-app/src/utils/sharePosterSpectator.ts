import * as ExpoLinking from "expo-linking";
import { buildLiveSpectatorSnapshot } from "../effects/revealSpectatorSnapshot";
import { appViewToHref } from "../navigation/appViewRoutes";
import { resolveSpectatorShareToken } from "../services/spectatorService";

type Params = {
  authToken: string;
  orderId: string;
  drawCount: number;
  topPrizeName?: string;
  spectatorShareToken?: string | null;
  boxId?: string;
  phase?: string;
};

export async function resolveSpectatorPosterLink({
  authToken,
  orderId,
  drawCount,
  topPrizeName,
  spectatorShareToken,
  boxId,
  phase = "summary",
}: Params): Promise<string | null> {
  const snapshot = buildLiveSpectatorSnapshot({
    revealIndex: Math.max(0, drawCount - 1),
    total: drawCount,
    products: topPrizeName ? [{ id: orderId, name: topPrizeName, price: 0 }] : [],
    current: topPrizeName ? { id: orderId, name: topPrizeName, price: 0 } : null,
  });
  const token = await resolveSpectatorShareToken(authToken, orderId, spectatorShareToken ?? null, {
    boxId,
    phase,
    snapshot,
  });
  if (!token) return null;
  return ExpoLinking.createURL(appViewToHref("revealSpectator", { spectatorToken: token }));
}
