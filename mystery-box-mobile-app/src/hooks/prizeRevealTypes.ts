import type { Product } from "../types";
import type { RevealPacing } from "../effects/revealSequence";
import type { ReduceMotionLevel } from "../effects/revealRemote";

export type PrizeRevealOptions = {
  products: Product[];
  lowPerfMode: boolean;
  reduceMotion: boolean;
  reduceMotionLevel?: ReduceMotionLevel;
  autoReplay: boolean;
  soundEnabled: boolean;
  revealIndex?: number;
  totalReveals?: number;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  pacing?: RevealPacing;
  drawProducts?: Product[];
  prizeName?: string;
  prizeImageUri?: string;
  boxName?: string;
  boxCategoryName?: string;
  orderId?: string;
  isReplaySession?: boolean;
  hasAuth?: boolean;
  onRevealComplete?: () => void;
};
