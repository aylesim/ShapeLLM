import { affectColorPair } from "./palette";
import { clamp01, type AffectVector, type FormParams } from "./types";

/**
 * The LLM never generates geometry. It only produces a reading.
 * This pure function is the single, testable bridge between meaning and matter.
 */
export function vectorToForm(vector: AffectVector, seed = 0): FormParams {
  const spike = clamp01(
    Math.pow(clamp01(vector.arousal), 1.22) * (0.45 + 0.55 * (1 - vector.warmth)) +
      vector.tension * 0.2,
  );
  const twist =
    (vector.tension - 0.45) * 1.7 +
    (vector.dominance - 0.5) * 0.35 +
    Math.sin(seed * 0.7) * 0.04;
  const scale = 0.9 + vector.dominance * 0.28 - (1 - vector.certainty) * 0.05;
  const roughness = clamp01(0.2 + (1 - vector.warmth) * 0.58 - vector.certainty * 0.1);
  const jitter = clamp01((1 - vector.certainty) * 0.9 + vector.tension * 0.16);
  const rotationSpeed = 0.06 + vector.arousal * 0.48;
  const emissive = clamp01(vector.arousal * 0.68 + vector.tension * 0.22);
  const particle = clamp01(vector.arousal * 0.8 + (1 - vector.certainty) * 0.25);
  const color = affectColorPair(vector);

  return {
    spike,
    twist,
    scale,
    roughness,
    jitter,
    rotationSpeed,
    emissive,
    particle,
    colorA: color.core,
    colorB: color.rim,
    glow: color.glow,
  };
}

export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000) / 1000;
}
