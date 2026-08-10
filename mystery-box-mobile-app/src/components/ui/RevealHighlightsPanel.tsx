import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { fetchDrawFeed, type DrawFeedItem } from "../../services/drawFeedService";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { normalizeQualityTier, qualityLabel } from "../../utils/quality";
import { useAuthToken } from "../../hooks/useAuthToken";

type Props = {
  boxId?: string | null;
};

export function RevealHighlightsPanel({ boxId }: Props) {
  const { t } = useTranslation();
  const authToken = useAuthToken();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DrawFeedItem[]>([]);
  const enabled = getRevealRemoteConfig().highlightsPanelEnabled;

  useEffect(() => {
    if (!enabled || !boxId) return;
    void fetchDrawFeed(authToken, boxId, 5)
      .then((rows) => setItems(rows.slice(0, 3)))
      .catch(() => undefined);
  }, [enabled, boxId, authToken]);

  if (!enabled || items.length === 0) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.fab}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t("revealOverlay.highlightsA11y")}
      >
        <Text style={styles.fabIcon}>✦</Text>
      </Pressable>
      {open ? (
        <View style={styles.panel}>
          <Text style={styles.title}>{t("revealOverlay.highlightsTitle")}</Text>
          {items.map((item) => (
            <Text key={item.id} style={styles.row} numberOfLines={1}>
              {qualityLabel(normalizeQualityTier(item.qualityType), t)} · {item.productName}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", bottom: 96, right: 16, zIndex: 2300 },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  fabIcon: { color: "#fff", fontSize: 18, fontWeight: "800" },
  panel: {
    position: "absolute",
    bottom: 52,
    right: 0,
    width: 220,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 6,
  },
  title: { color: "#fff", fontWeight: "800", fontSize: 12, marginBottom: 4 },
  row: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
});
