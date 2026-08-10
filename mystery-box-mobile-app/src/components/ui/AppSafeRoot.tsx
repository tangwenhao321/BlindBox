import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** 根容器背景；顶部安全区由根级 SafeAreaView + AppChrome 统一处理，避免重复 inset 留黑缝 */
export function AppSafeRoot({ children, style }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bgPage }, style]}>
      {children}
    </View>
  );
}
