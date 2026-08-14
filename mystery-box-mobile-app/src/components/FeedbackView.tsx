import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { pickAndUploadImage } from "../utils/uploadImage";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAuthToken } from "../hooks/useAuthToken";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { PrimaryButton } from "./ui/PrimaryButton";
import { EmptyState } from "./EmptyState";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useListLoad } from "../hooks/useListLoad";
import { SectionHeading } from "./ui/SectionHeading";
import { useScreenStyles } from "../styles/screenStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { FeedbackItem } from "../types";

type Props = {
  onBack: () => void;
  onSubmit: (content: string, pictures?: string[]) => Promise<void>;
  onLoadHistory?: () => Promise<FeedbackItem[]>;
};

export function FeedbackView({ onBack, onSubmit, onLoadHistory }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildFeedbackStyles);
  const screenStyles = useScreenStyles();
  const [content, setContent] = useState("");
  const [pictureUrls, setPictureUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const { loadError: historyError, loading: loadingHistory, runLoad } = useListLoad();

  const loadHistory = useCallback(async () => {
    if (!onLoadHistory) return;
    await runLoad(async () => {
      setHistory(await onLoadHistory());
    });
  }, [onLoadHistory, runLoad]);

  useEffect(() => {
    if (historyError) setHistory([]);
  }, [historyError]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("feedback.title")} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <SectionHeading title={t("feedback.sectionContent")} subtitle={t("common.sectionFeedback")} />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={t("feedback.contentPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
          />
          <TextInput
            value={pictureUrls}
            onChangeText={setPictureUrls}
            placeholder={t("feedback.photoPlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={screenStyles.input}
            accessibilityLabel={t("feedback.photoA11y")}
          />
          <PrimaryButton
            label={t("feedback.uploadPhoto")}
            variant="secondary"
            onPress={async () => {
              const url = await pickAndUploadImage(authToken);
              if (!url) return;
              setPictureUrls((prev) => (prev.trim() ? `${prev.trim()},${url}` : url));
            }}
            style={styles.uploadBtn}
          />
          <PrimaryButton
            label={submitting ? t("feedback.submitting") : t("feedback.submit")}
            loading={submitting}
            disabled={!content.trim() || submitting}
            onPress={async () => {
              const pictures = pictureUrls
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const body = content.trim();
              const perform = async () => {
                setSubmitting(true);
                try {
                  await onSubmit(body, pictures.length ? pictures : undefined);
                  toast.success(t("feedback.submitSuccess"));
                  setContent("");
                  setPictureUrls("");
                  await loadHistory();
                } catch (error) {
                  toast.error(parseError(error));
                } finally {
                  setSubmitting(false);
                }
              };
              if (
                queueIfOffline(i18n.t("offline.actionFeedback"), perform, {
                  kind: "submitFeedback",
                  token: authToken,
                  payload: { content: body, pictures: pictures.length ? pictures : undefined },
                })
              )
                return;
              await perform();
            }}
          />
        </View>

        <View style={styles.card}>
          <SectionHeading title={t("feedback.sectionHistory")} subtitle={t("common.sectionHistory")} />
          {historyError ? <ListErrorBanner message={historyError} onRetry={() => void loadHistory()} /> : null}
          {loadingHistory ? <ListSkeleton variant="row" rows={3} /> : null}
          {listEmptyWhenOk(
            historyError,
            !loadingHistory && history.length === 0 ? (
              <EmptyState title={t("feedback.emptyHistory")} variant="plain" />
            ) : null,
          )}
          {!loadingHistory && !historyError
            ? history.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <Text style={styles.historyContent}>{item.content}</Text>
                  {item.createdTime ? <Text style={styles.hint}>{item.createdTime}</Text> : null}
                </View>
              ))
            : null}
        </View>
      </ScreenScaffold>
    </View>
  );
}

function buildFeedbackStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    content: { gap: spacing.md, paddingBottom: layout.screenPaddingBottom },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.borderSoft,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.bgSoft,
      fontSize: typography.body,
      color: colors.textPrimary,
      textAlignVertical: "top",
      minHeight: 140,
      marginBottom: spacing.sm,
    },
    hint: { color: colors.textMuted, fontSize: typography.caption },
    uploadBtn: { marginBottom: spacing.sm },
    historyRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    },
    historyContent: { color: colors.textPrimary, lineHeight: 22, fontSize: typography.body },
  });
}
