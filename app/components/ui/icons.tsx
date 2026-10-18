import type { SVGProps } from "react";

export type IconName =
  | "play"
  | "pause"
  | "stop"
  | "restart"
  | "download"
  | "share"
  | "settings"
  | "chevron"
  | "arrow"
  | "eye"
  | "cube"
  | "volume"
  | "mute"
  | "check"
  | "copy"
  | "close"
  | "spark"
  | "grid"
  | "beaker";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 18, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.5v13l10-6.5-10-6.5Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="7" y="5" width="3.5" height="14" rx="0.5" />
          <rect x="13.5" y="5" width="3.5" height="14" rx="0.5" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
        </svg>
      );
    case "restart":
      return (
        <svg {...common}>
          <path d="M4 10a8 8 0 1 1 2.3 6.7" />
          <path d="M4 4v6h6" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 19h16" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="2.4" />
          <circle cx="18" cy="6" r="2.4" />
          <circle cx="18" cy="18" r="2.4" />
          <path d="m8.2 10.9 7.6-3.8" />
          <path d="m8.2 13.1 7.6 3.8" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M4 12h16" />
          <path d="m14 6 6 6-6 6" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "cube":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </svg>
      );
    case "volume":
      return (
        <svg {...common}>
          <path d="M4 10v4h3.5L13 19V5L7.5 10H4Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M18.5 6.5a8 8 0 0 1 0 11" />
        </svg>
      );
    case "mute":
      return (
        <svg {...common}>
          <path d="M4 10v4h3.5L13 19V5L7.5 10H4Z" />
          <path d="m17 9 4 6" />
          <path d="m21 9-4 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m4 12 5 5L20 6" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="11" height="11" rx="1.5" />
          <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-9A1.5 1.5 0 0 0 4 6.5v9A1.5 1.5 0 0 0 5.5 17H8" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m5 5 14 14" />
          <path d="m19 5-14 14" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M3 12h4" />
          <path d="M17 12h4" />
          <path d="m5.6 5.6 2.8 2.8" />
          <path d="m15.6 15.6 2.8 2.8" />
          <path d="m18.4 5.6-2.8 2.8" />
          <path d="m8.4 15.6-2.8 2.8" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );
    case "beaker":
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v6l-5.2 8.4A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3.6L14 9V3" />
          <path d="M7.5 16h9" />
        </svg>
      );
    default:
      return null;
  }
}
