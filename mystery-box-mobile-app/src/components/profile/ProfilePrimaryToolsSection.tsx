import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { useAppTheme } from "../../context/ThemeContext";
import { PRIMARY_TOOLS, type PrimaryTool } from "./profileConstants";
import { ProfileGlyph } from "./ProfileGlyph";

type Props = {
  openPrimaryTool: (action: PrimaryTool["action"]) => void;
  styles: Record<string, object>;
};

export function ProfilePrimaryToolsSection({ openPrimaryTool, styles }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <AnimatedRevealCard delay={100}>
      <View style={styles.primaryCard}>
        <View style={styles.primaryToolsRow}>
          {PRIMARY_TOOLS.map((tool) => (
            <Pressable
              key={tool.key}
              style={({ pressed }) => [styles.primaryTool, pressed ? styles.pressablePressed : null]}
              onPress={() => openPrimaryTool(tool.action)}
              accessibilityRole="button"
              accessibilityLabel={t(tool.labelKey)}
            >
              <View style={styles.primaryIconWrap}>
                <ProfileGlyph iconSet={tool.iconSet} icon={tool.icon} color={colors.brand} size={22} />
              </View>
              <Text style={styles.primaryToolLabel}>{t(tool.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AnimatedRevealCard>
  );
}
