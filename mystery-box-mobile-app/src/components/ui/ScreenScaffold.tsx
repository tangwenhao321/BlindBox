import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { layout, spacing } from "../../styles/tokens";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
} & Pick<ScrollViewProps, "refreshControl" | "showsVerticalScrollIndicator">;

export function ScreenScaffold({
  children,
  scroll = true,
  noPadding,
  style,
  contentContainerStyle,
  refreshControl,
  showsVerticalScrollIndicator = false,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bgPage },
      }),
    [colors.bgPage],
  );
  const pad = noPadding
    ? undefined
    : {
        paddingHorizontal: layout.screenPaddingX,
        paddingTop: spacing.md,
        paddingBottom: layout.screenPaddingBottom,
      };

  if (!scroll) {
    return <View style={[styles.root, pad, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={[pad, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
