import { AXES, AXIS_META, type Axis, type AxisReading } from "@/lib/reading/types";
import { formatValue } from "@/lib/reading/palette";

type MiniAxesProps = {
  axes: Record<Axis, AxisReading>;
  className?: string;
};

export function MiniAxes({ axes, className = "" }: MiniAxesProps) {
  return (
    <div className={`mini-axes ${className}`} aria-hidden="true">
      {AXES.map((axis) => {
        const meta = AXIS_META[axis];
        const value = axes[axis].value;
        return (
          <span
            key={axis}
            className="mini-axis"
            title={`${meta.label}: ${formatValue(value)}`}
            style={{
              height: `${Math.max(10, value * 100)}%`,
              background: meta.color,
            }}
          />
        );
      })}
    </div>
  );
}
