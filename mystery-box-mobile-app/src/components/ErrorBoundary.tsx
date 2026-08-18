import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { reportAppError } from "../utils/crashReport";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null; componentStack: string | null };

const SHOW_STACK =
  __DEV__ ||
  process.env.EXPO_PUBLIC_APP_VARIANT === "test" ||
  process.env.EXPO_PUBLIC_APP_VARIANT === "dev";

function ErrorFallback({
  onReset,
  hasHomeReset,
  errorMessage,
  componentStack,
}: {
  onReset: () => void;
  hasHomeReset: boolean;
  errorMessage?: string;
  componentStack?: string | null;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildErrorBoundaryStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("errorBoundary.title")}</Text>
      <Text style={styles.msg}>{t("errorBoundary.description")}</Text>
      <Text style={styles.detail} selectable>
        {errorMessage?.trim() || t("errorBoundary.unknown")}
      </Text>
      {SHOW_STACK ? (
        <Text style={styles.detail} selectable>
          build {process.env.EXPO_PUBLIC_APP_VARIANT || "dev"} / {String(process.env.EXPO_PUBLIC_API_BASE_URL || "").slice(0, 48)}
        </Text>
      ) : null}
      {SHOW_STACK && componentStack ? (
        <Text style={styles.stack} selectable>
          {componentStack.trim().slice(0, 900)}
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
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console -- intentional diagnostics
    console.error("App render error", error, info.componentStack);
    reportAppError(error, info.componentStack?.slice(0, 120));
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = () => {
    this.setState({ error: null, componentStack: null });
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
        componentStack={this.state.componentStack}
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
    stack: {
      fontSize: typography.micro,
      color: colors.textMuted,
      textAlign: "left",
      alignSelf: "stretch",
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
      maxHeight: 180,
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
