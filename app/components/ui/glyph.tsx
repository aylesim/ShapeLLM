import { affectToCss } from "@/lib/reading/palette";
import {
  AXES,
  AXIS_META,
  emptyVector,
  type AffectVector,
  type Reading,
} from "@/lib/reading/types";

type SpecimenGlyphProps = {
  reading?: Reading;
  vector?: AffectVector;
  size?: number;
  className?: string;
  title?: string;
  showGrid?: boolean;
  showDots?: boolean;
};

const CENTER = 60;
const RADIUS = 44;

function pointFor(value: number, index: number, radius = RADIUS) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  const distance = radius * Math.max(0.07, value);
  return {
    x: CENTER + Math.cos(angle) * distance,
    y: CENTER + Math.sin(angle) * distance,
  };
}

export function SpecimenGlyph({
  reading,
  vector,
  size = 120,
  className = "",
  title,
  showGrid = true,
  showDots = true,
}: SpecimenGlyphProps) {
  const values = reading
    ? AXES.map((axis) => reading.axes[axis].value)
    : AXES.map((axis) => (vector ?? emptyVector())[axis]);

  const valence = reading?.axes.valence.value ?? vector?.valence ?? 0.5;
  const arousal = reading?.axes.arousal.value ?? vector?.arousal ?? 0.5;
  const color = affectToCss(valence, arousal);

  const polygon = values
    .map((value, index) => {
      const point = pointFor(value, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`glyph ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {showGrid
        ? [0.33, 0.66, 1].map((ring) => (
            <polygon
              key={ring}
              points={AXES.map((_, index) => {
                const point = pointFor(ring, index);
                return `${point.x},${point.y}`;
              }).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={0.8}
            />
          ))
        : null}

      {showGrid
        ? AXES.map((axis, index) => {
            const point = pointFor(1, index);
            return (
              <line
                key={axis}
                x1={CENTER}
                y1={CENTER}
                x2={point.x}
                y2={point.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={0.8}
              />
            );
          })
        : null}

      <polygon
        points={polygon}
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      {showDots
        ? AXES.map((axis, index) => {
            const point = pointFor(values[index], index);
            return (
              <circle
                key={axis}
                cx={point.x}
                cy={point.y}
                r={1.9}
                fill={AXIS_META[axis].color}
              />
            );
          })
        : null}

      <circle cx={CENTER} cy={CENTER} r={1.4} fill={color} fillOpacity={0.9} />
    </svg>
  );
}
