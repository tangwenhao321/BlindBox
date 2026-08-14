import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../EmptyState";
import { SectionHeading } from "../ui/SectionHeading";
import { OrderPrizeCard } from "../OrderPrizeCard";
import { hasOrderRevealBeenSeen } from "../../effects/revealOrchestrator";
import { resolveProductStory } from "../../effects/revealProductStory";
import type { Product } from "../../types";

type DuplicateMeta = { duplicateIndex?: number; duplicateCount?: number };

type Props = {
  orderId: string;
  prizesUnveiled: boolean;
  immersiveReplay: boolean;
  showReveal: boolean;
  prizeProducts: Product[];
  prizeDuplicateMeta: DuplicateMeta[];
  isTablet: boolean;
  replayBlocked: boolean;
  replayPref: "all" | "finale" | "highlights";
  replayPlaylistIndices: number[];
  onReplayFinale: () => void;
  onReplayAll: () => void;
  onStory: (story: ReturnType<typeof resolveProductStory>) => void;
  styles: Record<string, object>;
};

export function OrderDetailsPrizes({
  orderId,
  prizesUnveiled,
  immersiveReplay,
  showReveal,
  prizeProducts,
  prizeDuplicateMeta,
  isTablet,
  replayBlocked,
  replayPref,
  replayPlaylistIndices,
  onReplayFinale,
  onReplayAll,
  onStory,
  styles,
}: Props) {
  const { t } = useTranslation();

  if (!prizesUnveiled) {
    return (
      <View style={styles.prizeFreezeMask} pointerEvents="none">
        <View style={styles.prizePlaceholder}>
          <SectionHeading title={t("orderDetails.prizesSection")} />
          <Text style={styles.prizeFrozenHint}>{t("orderDetails.revealInProgress")}</Text>
        </View>
      </View>
    );
  }

  if (immersiveReplay && showReveal) return null;

  return (
    <View style={styles.prizeBlock}>
      <View style={styles.prizeHeaderRow}>
        <SectionHeading title={t("orderDetails.prizesSection")} />
        <View style={styles.replayBtnRow}>
          <Pressable
            style={[styles.replayButton, replayBlocked ? styles.replayButtonDisabled : null]}
            onPress={onReplayFinale}
            disabled={replayBlocked}
            accessibilityRole="button"
            accessibilityLabel={t("orderDetails.replayFinale")}
          >
            <Text style={styles.replayText}>{t("orderDetails.replayFinale")}</Text>
          </Pressable>
          {prizeProducts.length > 1 &&
          (replayPref === "all" || (replayPref === "highlights" && replayPlaylistIndices.length > 1)) ? (
            <Pressable
              style={[styles.replayButton, replayBlocked ? styles.replayButtonDisabled : null]}
              onPress={onReplayAll}
              disabled={replayBlocked}
              accessibilityRole="button"
              accessibilityLabel={t("orderDetails.replayAll")}
            >
              <Text style={styles.replayText}>{t("orderDetails.replayAll")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {hasOrderRevealBeenSeen(orderId) ? (
        <Text style={styles.sessionReplayHint}>{t("orderDetails.sessionAutoPlayDone")}</Text>
      ) : null}
      {prizeProducts.length === 0 ? (
        <EmptyState title={t("orderDetails.emptyPrizesTitle")} description={t("orderDetails.emptyPrizesDesc")} variant="plain" />
      ) : (
        <View style={isTablet ? styles.prizeGrid : undefined}>
          {prizeProducts.map((product, index) => (
            <View key={`${product.id}-${index}`} style={isTablet ? styles.prizeGridItem : undefined}>
              <OrderPrizeCard
                product={product}
                duplicateIndex={prizeDuplicateMeta[index]?.duplicateIndex}
                duplicateCount={prizeDuplicateMeta[index]?.duplicateCount}
                onLongPressStory={() => onStory(resolveProductStory(product.id, product.name))}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
