"use client";

import { useId } from "react";
import { affectToCss } from "@/lib/reading/palette";
import type { Beat } from "@/lib/reading/types";

type ArcProps = {
  beats: Beat[];
  activeIndex: number;
  progress: number;
  arc?: string;
  onSeek: (index: number) => void;
};

const WIDTH = 1000;
const HEIGHT = 150;
const PAD = 20;

function valenceY(value: number): number {
  return 18 + (1 - value) * 52;
}

function arousalY(value: number): number {
  return 140 - value * 40;
}

export function ReadingArc({ beats, activeIndex, progress, arc, onSeek }: ArcProps) {
  const gradientId = useId().replace(/:/g, "");
  const count = beats.length;

  if (count === 0) return null;

  const x = (index: number) => {
    if (count === 1) return WIDTH / 2;
    return PAD + (index / (count - 1)) * (WIDTH - PAD * 2);
  };

  const valencePath = beats
    .map((beat, index) => {
      const y = valenceY(beat.axes.valence.value);
      return `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const arousalPath = [
    `M ${x(0).toFixed(2)} 140`,
    ...beats.map(
      (beat, index) =>
        `L ${x(index).toFixed(2)} ${arousalY(beat.axes.arousal.value).toFixed(2)}`,
    ),
    `L ${x(count - 1).toFixed(2)} 140`,
    "Z",
  ].join(" ");

  const playheadX =
    count === 1
      ? WIDTH / 2
      : x(activeIndex) +
        Math.min(1, Math.max(0, progress)) * (x(activeIndex + 1) - x(activeIndex));

  const handleSeek = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (count - 1));
    onSeek(index);
  };

  return (
    <div className="arc">
      <div className="arc-caption">
        <span>
          <strong>arc</strong> {arc ?? "—"}
        </span>
        <span>
          beat {activeIndex + 1} / {count}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="slider"
        tabIndex={0}
        aria-label="Emotional arc. Use the left and right arrow keys to move between beats."
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={activeIndex + 1}
        onClick={(event) => handleSeek(event.clientX, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(Math.min(count - 1, activeIndex + 1));
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(Math.max(0, activeIndex - 1));
          }
        }}
      >
        <defs>
          <linearGradient id={`${gradientId}-arousal`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={PAD}
          x2={WIDTH - PAD}
          y1={valenceY(0.5)}
          y2={valenceY(0.5)}
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeDasharray="2 5"
          vectorEffect="non-scaling-stroke"
        />

        <path d={arousalPath} fill={`url(#${gradientId}-arousal)`} />

        <path
          d={valencePath}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.7"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />

        {beats.map((beat, index) => {
          const color = affectToCss(
            beat.axes.valence.value,
            beat.axes.arousal.value,
          );
          const active = index === activeIndex;
          return (
            <g key={beat.id}>
              <circle
                cx={x(index)}
                cy={valenceY(beat.axes.valence.value)}
                r={active ? 5 : 3}
                fill={color}
                stroke={active ? "var(--fg)" : "transparent"}
                strokeWidth={active ? 1.2 : 0}
              />
            </g>
          );
        })}

        <line
          x1={playheadX}
          x2={playheadX}
          y1={10}
          y2={HEIGHT - 6}
          stroke="var(--accent)"
          strokeOpacity="0.55"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={playheadX}
          cy={valenceY(beats[activeIndex]?.axes.valence.value ?? 0.5)}
          r="3.5"
          fill="var(--accent)"
        />
      </svg>
    </div>
  );
}
