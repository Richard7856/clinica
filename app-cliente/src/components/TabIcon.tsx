import React from "react";
import Svg, { G, Path, Rect, Circle } from "react-native-svg";

// Íconos de la barra inferior. `name` selecciona el glifo; color/size vienen
// del navigator según el tab activo.
export type TabName =
  | "inicio"
  | "recompensas"
  | "comprar"
  | "ubicacion"
  | "promos"
  | "aparatos"
  | "citas";

export function TabIcon({
  name,
  color,
  size = 22,
}: {
  name: TabName;
  color: string;
  size?: number;
}) {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "inicio" && (
        <G {...stroke}>
          <Path d="M3 10.5 12 3l9 7.5" />
          <Path d="M5 9.5V21h14V9.5" />
        </G>
      )}
      {name === "recompensas" && (
        <G {...stroke}>
          <Rect x={3} y={8} width={18} height={4} rx={1} />
          <Path d="M5 12v9h14v-9M12 8v13" />
          <Path d="M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z" />
        </G>
      )}
      {name === "comprar" && (
        <G {...stroke}>
          <Path d="M6 7h12l1 14H5L6 7z" />
          <Path d="M9 7a3 3 0 0 1 6 0" />
        </G>
      )}
      {name === "ubicacion" && (
        <G {...stroke}>
          <Path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
          <Circle cx={12} cy={10} r={2.5} />
        </G>
      )}
      {name === "promos" && (
        <G {...stroke}>
          <Path d="M20.6 4.6a5 5 0 0 0-7 0L12 6l-1.6-1.4a5 5 0 0 0-7 7L12 20l8.6-8.4a5 5 0 0 0 0-7z" />
        </G>
      )}
      {name === "aparatos" && (
        <G {...stroke}>
          <Rect x={4} y={4} width={16} height={16} rx={2} />
          <Path d="M9 9h6v6H9zM4 10h1M4 14h1M19 10h1M19 14h1M10 4v1M14 4v1M10 19v1M14 19v1" />
        </G>
      )}
      {name === "citas" && (
        <G {...stroke}>
          <Rect x={3} y={4} width={18} height={18} rx={2} />
          <Path d="M3 10h18M8 2v4M16 2v4M8 15l2 2 4-4" />
        </G>
      )}
    </Svg>
  );
}
