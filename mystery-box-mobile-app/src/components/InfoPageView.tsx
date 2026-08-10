import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PageHeader } from "./PageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  title: string;
  paragraphs: string[];
  onBack: () => void;
};

export function InfoPageView({ title, paragraphs, onBack }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildInfoPageStyles);

  return (
    <ScreenScaffold contentContainerStyle={styles.content}>
      <PageHeader
        title={title}
        subtitle={t("infoPage.subtitle")}
        onBack={onBack}
        backLabel={t("common.back")}
      />
      <View style={styles.card}>
        {paragraphs.map((paragraph) => (
          <Text key={paragraph.slice(0, 24)} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    </ScreenScaffold>
  );
}

function buildInfoPageStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { padding: spacing.lg },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: spacing.lg,
      gap: spacing.md,
    },
    paragraph: { fontSize: typography.body, color: colors.textPrimary, lineHeight: 24 },
  });
}
