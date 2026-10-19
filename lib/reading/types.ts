export const AXES = [
  "valence",
  "arousal",
  "dominance",
  "tension",
  "warmth",
  "certainty",
] as const;

export type Axis = (typeof AXES)[number];

export const LABELS = [
  "serene",
  "warm",
  "neutral",
  "uneasy",
  "tense",
  "frustrated",
  "furious",
  "ironic",
  "melancholy",
] as const;

export type ReadingLabel = (typeof LABELS)[number];

export type Source = "llm" | "heuristic" | "curated";

export type AxisReading = {
  value: number;
  confidence: number;
};

export type AffectVector = Record<Axis, number>;

export type Evidence = {
  axis: Axis;
  quote: string;
  why: string;
  start?: number;
  end?: number;
  anchored?: boolean;
};

export type Trace = {
  requestId: string;
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cached: boolean;
  repaired: boolean;
  route: string;
};

export type Reading = {
  id: string;
  version: string;
  source: Source;
  language: string;
  text: string;
  label: ReadingLabel;
  summary: string;
  axes: Record<Axis, AxisReading>;
  evidence: Evidence[];
  ambiguity: string | null;
  trace: Trace;
};

export type Beat = {
  id: string;
  quote: string;
  start: number;
  end: number;
  axes: Record<Axis, AxisReading>;
  label: ReadingLabel;
  confidence: number;
  evidence: Evidence[];
  note: string | null;
};

export type Performance = {
  id: string;
  version: string;
  source: Source;
  language: string;
  text: string;
  document: Reading;
  beats: Beat[];
  arc: string;
  trace: Trace;
};

export type FormParams = {
  spike: number;
  twist: number;
  scale: number;
  roughness: number;
  jitter: number;
  rotationSpeed: number;
  emissive: number;
  particle: number;
  colorA: string;
  colorB: string;
  glow: number;
};

export type AxisMeta = {
  key: Axis;
  label: string;
  short: string;
  color: string;
  low: string;
  high: string;
};

export const AXIS_META: Record<Axis, AxisMeta> = {
  valence: {
    key: "valence",
    label: "Valence",
    short: "VAL",
    color: "#7a8499",
    low: "hostile",
    high: "warm",
  },
  arousal: {
    key: "arousal",
    label: "Arousal",
    short: "ARO",
    color: "#ff7a59",
    low: "still",
    high: "activated",
  },
  dominance: {
    key: "dominance",
    label: "Dominance",
    short: "DOM",
    color: "#5b8def",
    low: "powerless",
    high: "commanding",
  },
  tension: {
    key: "tension",
    label: "Tension",
    short: "TEN",
    color: "#e879c9",
    low: "relaxed",
    high: "conflicted",
  },
  warmth: {
    key: "warmth",
    label: "Warmth",
    short: "WAR",
    color: "#b6e36b",
    low: "cold",
    high: "warm",
  },
  certainty: {
    key: "certainty",
    label: "Certainty",
    short: "CER",
    color: "#27a5b1",
    low: "hedged",
    high: "absolute",
  },
};

export const LABEL_COPY: Record<ReadingLabel, string> = {
  serene: "Serene",
  warm: "Warm",
  neutral: "Neutral",
  uneasy: "Uneasy",
  tense: "Tense",
  frustrated: "Frustrated",
  furious: "Furious",
  ironic: "Ironic",
  melancholy: "Melancholy",
};

export function emptyVector(value = 0.5): AffectVector {
  return {
    valence: value,
    arousal: value,
    dominance: value,
    tension: value,
    warmth: value,
    certainty: value,
  };
}

export function vectorFromReading(reading: Reading): AffectVector {
  return {
    valence: reading.axes.valence.value,
    arousal: reading.axes.arousal.value,
    dominance: reading.axes.dominance.value,
    tension: reading.axes.tension.value,
    warmth: reading.axes.warmth.value,
    certainty: reading.axes.certainty.value,
  };
}

export function vectorFromBeat(beat: Beat): AffectVector {
  return {
    valence: beat.axes.valence.value,
    arousal: beat.axes.arousal.value,
    dominance: beat.axes.dominance.value,
    tension: beat.axes.tension.value,
    warmth: beat.axes.warmth.value,
    certainty: beat.axes.certainty.value,
  };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function averageConfidence(axes: Record<Axis, AxisReading>): number {
  const values = AXES.map((axis) => axes[axis].confidence);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function labelToArcWord(label: ReadingLabel): string {
  switch (label) {
    case "serene":
      return "calm";
    case "warm":
      return "warmth";
    case "neutral":
      return "stillness";
    case "uneasy":
      return "unease";
    case "tense":
      return "tension";
    case "frustrated":
      return "friction";
    case "furious":
      return "explosion";
    case "ironic":
      return "irony";
    case "melancholy":
      return "resignation";
  }
}
