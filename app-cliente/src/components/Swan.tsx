import React from "react";
import Svg, { G, Path } from "react-native-svg";
import { colors } from "@/theme";

// Logo del cisne de L'Ecrobelle. `color` por defecto es crema; usar dorado en
// badges de Cisnes. Escala con `size`.
export function Swan({
  size = 32,
  color = colors.cream,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M40 96 C 20 92 16 68 34 58 C 22 44 34 20 56 18 C 44 26 46 40 58 46" />
        <Path d="M56 18 C 66 16 76 22 74 32 C 73 37 69 40 64 40" />
        <Path d="M74 27 L 90 24 L 76 34" />
        <Path d="M58 46 C 80 50 92 66 86 86 C 80 98 58 100 44 94" />
        <Path d="M22 104 C 44 112 84 110 100 100" />
      </G>
    </Svg>
  );
}
