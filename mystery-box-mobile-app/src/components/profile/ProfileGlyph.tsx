import type { ComponentProps } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { VectorIconName } from "./profileConstants";

export function ProfileGlyph({
  iconSet,
  icon,
  color,
  size = 22,
}: {
  iconSet: "ion" | "mci";
  icon: VectorIconName;
  color: string;
  size?: number;
}) {
  const a11y = { accessibilityElementsHidden: true as const, importantForAccessibility: "no-hide-descendants" as const };
  if (iconSet === "mci") {
    return (
      <MaterialCommunityIcons
        name={icon as ComponentProps<typeof MaterialCommunityIcons>["name"]}
        size={size}
        color={color}
        {...a11y}
      />
    );
  }
  return <Ionicons name={icon as ComponentProps<typeof Ionicons>["name"]} size={size} color={color} {...a11y} />;
}
