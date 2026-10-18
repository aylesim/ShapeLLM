import {
  AXES,
  AXIS_META,
  type Axis,
  type AxisReading,
} from "@/lib/reading/types";
import { formatConfidence, formatValue } from "@/lib/reading/palette";
import { ProgressRing } from "../ui/progress-ring";

type AxisRingsProps = {
  axes: Record<Axis, AxisReading>;
  selectedAxis?: Axis | null;
  onSelect?: (axis: Axis) => void;
  className?: string;
};

export function AxisRings({
  axes,
  selectedAxis = null,
  onSelect,
  className = "",
}: AxisRingsProps) {
  return (
    <div className={`axis-rings ${className}`}>
      {AXES.map((axis) => {
        const meta = AXIS_META[axis];
        const reading = axes[axis];
        return (
          <button
            key={axis}
            type="button"
            className="axis-ring"
            data-selected={selectedAxis === axis}
            aria-pressed={selectedAxis === axis}
            onClick={() => onSelect?.(axis)}
          >
            <ProgressRing
              value={reading.value}
              size={64}
              stroke={6}
              color={meta.color}
              label={formatValue(reading.value)}
            />
            <span className="axis-ring-label">{meta.label}</span>
            <span className="axis-ring-conf">{formatConfidence(reading.confidence)}</span>
          </button>
        );
      })}
    </div>
  );
}
