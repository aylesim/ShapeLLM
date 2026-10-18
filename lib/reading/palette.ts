import {
  AXES,
  AXIS_META,
  clamp01,
  type AffectVector,
  type Axis,
  type FormParams,
  type ReadingLabel,
} from "./types";

type Rgb = [number, number, number];

const SAD: Rgb = [92, 107, 138];
const CALM: Rgb = [127, 160, 140];
const ANGER: Rgb = [194, 84, 58];
const JOY: Rgb = [216, 178, 94];
const NEUTRAL: Rgb = [179, 165, 143];
const WARM_RIM: Rgb = [255, 226, 180];
const COOL_RIM: Rgb = [150, 185, 220];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const x = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * x,
    a[1] + (b[1] - a[1]) * x,
    a[2] + (b[2] - a[2]) * x,
  ];
}

function round(rgb: Rgb): Rgb {
  return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])];
}

export function affectToRgb(valence: number, arousal: number): Rgb {
  const x = clamp01(valence);
  const y = clamp01(arousal);

  const low = mix(SAD, CALM, x);
  const high = mix(ANGER, JOY, x);
  const base = mix(low, high, y);

  const neutrality =
    1 -
    Math.min(
      1,
      Math.abs(clamp01(valence) - 0.5) * 1.5 + Math.abs(clamp01(arousal) - 0.5) * 1.1,
    );

  return round(mix(base, NEUTRAL, neutrality * 0.4));
}

export function affectToCss(valence: number, arousal: number): string {
  const [r, g, b] = affectToRgb(valence, arousal);
  return `rgb(${r} ${g} ${b})`;
}

export function affectToHex(valence: number, arousal: number): string {
  const [r, g, b] = affectToRgb(valence, arousal);
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function affectToAlpha(valence: number, arousal: number, alpha: number): string {
  const [r, g, b] = affectToRgb(valence, arousal);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function affectColorPair(vector: AffectVector): {
  core: string;
  rim: string;
  glow: number;
} {
  const core = affectToRgb(vector.valence, vector.arousal);
  const rimTarget = vector.warmth >= 0.5 ? WARM_RIM : COOL_RIM;
  const rim = mix(core, rimTarget, 0.42 + vector.arousal * 0.18);
  const glow = clamp01(0.16 + vector.arousal * 0.72 + (1 - vector.certainty) * 0.18);
  return {
    core: `#${round(core)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`,
    rim: `#${round(rim)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`,
    glow,
  };
}

export function axisColor(axis: Axis): string {
  return AXIS_META[axis].color;
}

export function labelFor(vector: AffectVector): ReadingLabel {
  const { valence, arousal, dominance, tension, warmth } = vector;

  if (valence > 0.72 && arousal < 0.4 && warmth > 0.58) return "serene";
  if (valence > 0.68 && arousal < 0.62 && warmth > 0.6) return "warm";
  if (
    valence < 0.32 &&
    arousal > 0.62 &&
    (dominance > 0.5 || tension > 0.62)
  ) {
    return "furious";
  }
  if (valence < 0.38 && (tension > 0.58 || arousal > 0.55)) return "frustrated";
  if (valence < 0.44 && arousal < 0.38) return "melancholy";
  if (arousal > 0.64 || tension > 0.66) return "tense";
  if (valence < 0.46) return "uneasy";
  return "neutral";
}

function topAxes(vector: AffectVector, count = 2): Axis[] {
  return [...AXES]
    .sort((a, b) => vector[b] - vector[a])
    .slice(0, count);
}

export function summaryFor(label: ReadingLabel, vector: AffectVector): string {
  const [first, second] = topAxes(vector, 2);
  const firstLabel = AXIS_META[first].label.toLowerCase();
  const secondLabel = AXIS_META[second].label.toLowerCase();
  const firstCap = firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);

  switch (label) {
    case "serene":
      return `A settled reading: low activation, warm valence, and very little friction. ${firstCap} and ${secondLabel} carry the tone.`;
    case "warm":
      return `An open, generous reading. The text leans toward ${firstLabel} and ${secondLabel} rather than toward conflict.`;
    case "neutral":
      return `A level reading with no dominant emotional signal. ${firstCap} and ${secondLabel} are the quietest cues.`;
    case "uneasy":
      return `Something is slightly off. The text stays composed on the surface, but ${firstLabel} and ${secondLabel} pull against it.`;
    case "tense":
      return `The surface is controlled, the interior is not. ${firstCap} and ${secondLabel} create the pressure.`;
    case "frustrated":
      return `A complaint held in check. ${firstCap} and ${secondLabel} keep pushing through the politeness.`;
    case "furious":
      return `High activation, low warmth, strong assertion. ${firstCap} and ${secondLabel} dominate the reading.`;
    case "ironic":
      return `The words and the stance do not quite match. ${firstCap} and ${secondLabel} suggest a second layer.`;
    case "melancholy":
      return `A low, quiet reading. ${firstCap} and ${secondLabel} describe something that has already been lost.`;
  }
}

export function describeForm(form: FormParams): string {
  const surface =
    form.roughness > 0.62 ? "coarse" : form.roughness > 0.38 ? "matte" : "glasslike";
  const shape =
    form.spike > 0.62
      ? "radially spiked"
      : form.spike > 0.32
        ? "unsettled"
        : "smooth";
  const body = form.twist > 0.15 ? "twisted" : form.twist < -0.15 ? "counter-twisted" : "upright";
  const stability = form.jitter > 0.45 ? "shivering" : "steady";

  return `A ${body}, ${shape}, ${surface} body. ${stability[0].toUpperCase()}${stability.slice(1)} at the edges, with ${
    form.glow > 0.55 ? "a hot rim" : "a cool rim"
  } and ${form.scale > 1.05 ? "a heavy footprint" : "a light footprint"}.`;
}

export function formatValue(value: number): string {
  return value.toFixed(2);
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}
