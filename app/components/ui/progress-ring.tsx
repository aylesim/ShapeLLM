"use client";

import { useId } from "react";

type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  gradient?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  color = "var(--accent)",
  gradient = false,
  label,
  sublabel,
  className = "",
}: ProgressRingProps) {
  const id = useId().replace(/:/g, "");
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp01(value));
  const center = size / 2;

  return (
    <div
      className={`progress-ring ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? `${Math.round(clamp01(value) * 100)}%`}${sublabel ? ` ${sublabel}` : ""}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {gradient ? (
          <defs>
            <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b45ec" />
              <stop offset="55%" stopColor="#8b7cf6" />
              <stop offset="100%" stopColor="#27a5b1" />
            </linearGradient>
          </defs>
        ) : null}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#ring-${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 650ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="progress-ring-center">
        <span className="progress-ring-value" style={{ fontSize: Math.max(10, size * 0.19) }}>
          {label ?? `${Math.round(clamp01(value) * 100)}%`}
        </span>
        {sublabel ? <span className="progress-ring-sublabel">{sublabel}</span> : null}
      </div>
    </div>
  );
}
