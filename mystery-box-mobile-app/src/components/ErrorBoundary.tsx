import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { reportAppError } from "../utils/crashReport";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

function ErrorFallback({
  onReset,
  hasHomeReset,
  errorMessage,
}: {
  onReset: () => void;
  hasHomeReset: boolean;
  errorMessage?: string;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildErrorBoundaryStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("errorBoundary.title")}</Text>
      <Text style={styles.msg}>{t("errorBoundary.description")}</Text>
      {errorMessage ? (
        <Text style={styles.detail} selectable>
          {errorMessage}
        </Text>
      ) : null}
      <Pressable
        style={styles.btn}
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel={hasHomeReset ? t("errorBoundary.homeA11y") : t("errorBoundary.retryA11y")}
      >
        <Text style={styles.btnText}>{hasHomeReset ? t("errorBoundary.home") : t("errorBoundary.retry")}</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error", error, info.componentStack);
    reportAppError(error, info.componentStack?.slice(0, 120));
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <ErrorFallback
        onReset={this.reset}
        hasHomeReset={!!this.props.onReset}
        errorMessage={this.state.error?.message}
      />
    );
  }
}

function buildErrorBoundaryStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
      backgroundColor: colors.bgPage,
    },
    title: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.sm },
    msg: { fontSize: typography.body, color: colors.textMuted, textAlign: "center", marginBottom: spacing.lg },
    detail: {
      fontSize: typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    btn: {
      backgroundColor: colors.brand,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    btnText: { color: colors.textOnBrand, fontWeight: "700" },
  });
}
