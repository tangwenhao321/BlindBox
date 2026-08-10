import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import type { ThemeColors } from "../../styles/themes";
import { SubPageHeader } from "./SubPageHeader";

type Props = {
  title: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function SubPageScreen({ title, onBack, rightSlot, children }: Props) {
  const styles = useThemedStyles(buildSubPageScreenStyles);
  return (
    <SafeAreaView style={styles.root} edges={["left", "right"]}>
      <SubPageHeader title={title} onBack={onBack} rightSlot={rightSlot} />
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

function buildSubPageScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    body: { flex: 1 },
  });
}
