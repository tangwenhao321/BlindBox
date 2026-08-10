import { memo } from "react";
import { Pressable, Text } from "react-native";
import { useScreenStyles } from "../../styles/screenStyles";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

function ChipInner({ label, active, onPress }: Props) {
  const styles = useScreenStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chipBtn,
        active ? styles.chipBtnActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export const Chip = memo(ChipInner);
