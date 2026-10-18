import { anchorEvidence, anchorQuote, truncateWords } from "./anchor";
import { labelFor, summaryFor } from "./palette";
import {
  AXES,
  averageConfidence,
  clamp01,
  labelToArcWord,
  type AffectVector,
  type Axis,
  type AxisReading,
  type Beat,
  type Evidence,
  type Performance,
  type Reading,
  type ReadingLabel,
  type Trace,
} from "./types";

const NEGATIVE = new Set([
  "angry",
  "furious",
  "rage",
  "hate",
  "terrible",
  "awful",
  "worst",
  "disgusting",
  "unacceptable",
  "ridiculous",
  "stupid",
  "idiot",
  "damn",
  "sick",
  "tired",
  "disappointed",
  "frustrated",
  "annoyed",
  "upset",
  "betrayed",
  "ignored",
  "rude",
  "pathetic",
  "joke",
  "wrong",
  "broken",
  "failure",
  "no",
  "never",
  "arrabbiato",
  "furioso",
  "rabbia",
  "odio",
  "terribile",
  "orribile",
  "inaccettabile",
  "ridicolo",
  "stupido",
  "idiota",
  "stanco",
  "deluso",
  "frustrato",
  "annoiato",
  "tradito",
  "ignorato",
  "maleducato",
  "patetico",
  "basta",
  "sbagliato",
]);

const POSITIVE = new Set([
  "love",
  "loved",
  "great",
  "wonderful",
  "happy",
  "peaceful",
  "calm",
  "kind",
  "gentle",
  "thank",
  "thanks",
  "appreciate",
  "beautiful",
  "perfect",
  "delightful",
  "joy",
  "warm",
  "grateful",
  "glad",
  "fun",
  "nice",
  "good",
  "amazing",
  "amore",
  "bello",
  "felice",
  "calmo",
  "gentile",
  "grazie",
  "apprezzo",
  "perfetto",
  "meraviglioso",
  "contento",
  "sereno",
  "buono",
  "piacevole",
]);

const ANGER = new Set([
  "furious",
  "rage",
  "angry",
  "hate",
  "outraged",
  "livid",
  "fuming",
  "disgusted",
  "unacceptable",
  "enough",
  "stop",
  "betrayed",
  "insult",
  "ridiculous",
  "furioso",
  "rabbia",
  "arrabbiato",
  "odio",
  "inaccettabile",
  "basta",
]);

const ASSERTION = new Set([
  "will",
  "must",
  "never",
  "always",
  "demand",
  "expect",
  "require",
  "need",
  "cannot",
  "refuse",
  "absolutely",
  "definitely",
  "clearly",
  "obviously",
  "no",
  "not",
  "won't",
  "devo",
  "deve",
  "mai",
  "sempre",
  "assolutamente",
  "chiaramente",
]);

const HEDGES = new Set([
  "maybe",
  "perhaps",
  "probably",
  "possibly",
  "might",
  "could",
  "seems",
  "apparently",
  "sort",
  "kind",
  "forse",
  "penso",
  "credo",
  "magari",
  "probabilmente",
  "sembra",
]);

const WARM = new Set([
  "please",
  "thank",
  "thanks",
  "appreciate",
  "kind",
  "gentle",
  "love",
  "warm",
  "welcome",
  "grateful",
  "sorry",
  "understand",
  "forgive",
  "per",
  "favore",
  "grazie",
  "apprezzo",
  "gentile",
  "capisco",
  "dispiace",
]);

const TENSION = new Set([
  "but",
  "however",
  "yet",
  "still",
  "again",
  "although",
  "instead",
  "despite",
  "unless",
  "problem",
  "issue",
  "mistake",
  "wrong",
  "why",
  "confused",
  "ma",
  "però",
  "ancora",
  "invece",
  "nonostante",
  "problema",
  "errore",
  "sbagliato",
  "perché",
]);

const IRONY = new Set([
  "great",
  "fantastic",
  "wonderful",
  "sure",
  "perfect",
  "amazing",
  "nice",
  "wow",
  "splendido",
  "fantastico",
  "perfetto",
  "meraviglioso",
]);

const NEGATORS = new Set(["not", "no", "never", "cannot", "won't", "non", "mai"]);

const STRONG_ANGER = new Set([
  "furious",
  "rage",
  "outraged",
  "livid",
  "fuming",
  "hate",
  "unacceptable",
  "disgusted",
  "furioso",
  "rabbia",
  "odio",
]);

function tokensOf(text: string): string[] {
  return (text.toLowerCase().match(/[a-zàèéìòóùüç']+/g) ?? []).filter(Boolean);
}

function density(count: number, wordCount: number): number {
  return clamp01(count / Math.max(3, wordCount * 0.14));
}

function countSet(tokens: string[], set: Set<string>): number {
  return tokens.reduce((sum, token) => (set.has(token) ? sum + 1 : sum), 0);
}

function matched(tokens: string[], set: Set<string>, limit = 2): string[] {
  return tokens.filter((token) => set.has(token)).slice(0, limit);
}

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts =
    normalized.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((part) => part.trim()).filter(Boolean) ??
    [];
  return parts.length > 0 ? parts : [normalized];
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

function makeTrace(text: string): Trace {
  return {
    requestId: `local-${hashText(text)}`,
    provider: "local",
    model: "heuristic.v1",
    promptVersion: "heuristic.v1",
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    cached: false,
    repaired: false,
    route: "local",
  };
}

function sentenceSignal(sentence: string): Record<Axis, number> {
  const tokens = tokensOf(sentence);
  const lower = sentence.toLowerCase();
  const words = Math.max(1, tokens.length);

  const negative = density(countSet(tokens, NEGATIVE), words);
  const positive = density(countSet(tokens, POSITIVE), words);
  const anger = density(countSet(tokens, ANGER), words);
  const assertion = density(countSet(tokens, ASSERTION), words);
  const hedge = density(countSet(tokens, HEDGES), words);
  const warmth = density(countSet(tokens, WARM), words);
  const tension = density(countSet(tokens, TENSION), words);

  return {
    valence: negative * 1.1 + positive * 0.8,
    arousal: anger * 1.2 + negative * 0.5 + (/!{2,}/.test(lower) ? 0.4 : 0),
    dominance: assertion * 1.1 + anger * 0.4,
    tension: tension * 1.15 + (/\?/.test(lower) ? 0.25 : 0),
    warmth: warmth * 1.2 + positive * 0.4,
    certainty: assertion * 1.1 + hedge * 0.9,
  };
}

type Analysis = {
  vector: AffectVector;
  axes: Record<Axis, AxisReading>;
  label: ReadingLabel;
  summary: string;
  evidence: Evidence[];
  ambiguity: string | null;
};

function analyze(text: string): Analysis {
  const trimmed = text.trim();
  const tokens = tokensOf(trimmed);
  const words = Math.max(1, tokens.length);
  const sentences = splitSentences(trimmed);
  const negative = density(countSet(tokens, NEGATIVE), words);
  const positive = density(countSet(tokens, POSITIVE), words);
  const anger = density(countSet(tokens, ANGER), words);
  const assertion = density(countSet(tokens, ASSERTION), words);
  const hedge = density(countSet(tokens, HEDGES), words);
  const warmth = density(countSet(tokens, WARM), words);
  const tensionWords = density(countSet(tokens, TENSION), words);
  const ironyWords = density(countSet(tokens, IRONY), words);
  const negationCount = countSet(tokens, NEGATORS);
  const strongAnger = tokens.some((token) => STRONG_ANGER.has(token));

  const exclamations = (trimmed.match(/!/g) ?? []).length;
  const questions = (trimmed.match(/\?/g) ?? []).length;
  const letters = trimmed.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
  const uppercase = trimmed.replace(/[^A-ZÀ-Ý]/g, "").length;
  const capsRatio = letters > 0 ? uppercase / letters : 0;
  const repeats = (trimmed.match(/([a-zà-ÿ])\1{2,}/gi) ?? []).length;
  const doubledPunctuation = (trimmed.match(/[!?]{2,}/g) ?? []).length;

  const ex = clamp01(exclamations * 0.32);
  const caps = clamp01(capsRatio * 2.8);
  const questionsSignal = clamp01(questions * 0.22);
  const repeatSignal = clamp01(repeats * 0.25 + doubledPunctuation * 0.2);
  const lengthConfidence = clamp01(words / 220) * 0.18;

  const ironyMarkers = countSet(tokens, IRONY);
  const irony =
    (ironyMarkers > 0 ? 0.5 : 0) +
    ironyWords * 0.25 +
    (positive > 0.25 && negative > 0.25 && sentences.length <= 2 ? 0.2 : 0);

  let valence = 0.5 + positive * 0.4 - negative * 0.52 - anger * 0.16 + warmth * 0.1;
  let arousal =
    0.17 + ex * 0.28 + caps * 0.22 + anger * 0.3 + negative * 0.18 + repeatSignal * 0.1;
  let dominance =
    0.5 + assertion * 0.24 - hedge * 0.24 + anger * 0.12 + (caps > 0.25 ? 0.07 : 0);
  let tension =
    0.22 +
    tensionWords * 0.32 +
    questionsSignal * 0.12 +
    negative * 0.14 +
    repeatSignal * 0.08 +
    (positive > 0.25 && negative > 0.25 ? 0.18 : 0);
  let warmthAxis = 0.5 + warmth * 0.3 + positive * 0.16 - negative * 0.36 - anger * 0.14;
  let certainty =
    0.5 + assertion * 0.22 - hedge * 0.3 + lengthConfidence - questionsSignal * 0.12;

  if (strongAnger) {
    valence -= 0.1;
    arousal += 0.32;
    dominance += 0.06;
    tension += 0.08;
  }

  if (words < 8) {
    const pull = 0.3;
    const center = (value: number) => value + (0.5 - value) * pull;
    valence = center(valence);
    arousal = center(arousal);
    dominance = center(dominance);
    tension = center(tension);
    warmthAxis = center(warmthAxis);
    certainty = center(certainty);
  }

  const vector: AffectVector = {
    valence: clamp01(valence),
    arousal: clamp01(arousal),
    dominance: clamp01(dominance),
    tension: clamp01(tension),
    warmth: clamp01(warmthAxis),
    certainty: clamp01(certainty),
  };

  const confidenceBase = clamp01(0.54 + lengthConfidence + (words > 20 ? 0.05 : 0));
  const axes = Object.fromEntries(
    AXES.map((axis) => {
      const strength = Math.abs(vector[axis] - 0.5) * 0.18;
      return [
        axis,
        {
          value: vector[axis],
          confidence: clamp01(confidenceBase + strength),
        },
      ];
    }),
  ) as Record<Axis, AxisReading>;

  let label = labelFor(vector);
  const ambiguityParts: string[] = [];
  if (
    irony >= 0.5 &&
    ironyMarkers > 0 &&
    (negative > 0.1 || tensionWords > 0.1)
  ) {
    label = "ironic";
    ambiguityParts.push("praise and friction arrive together");
  }
  if (negationCount > 0 && negative > 0.2) {
    ambiguityParts.push("negation may reverse the surface tone");
  }
  if (words < 10 && ambiguityParts.length > 0) {
    ambiguityParts.push("very short text");
  }

  const evidence = buildEvidence(trimmed, sentences, vector);
  const summary =
    label === "ironic"
      ? "The words and the stance do not quite match. The surface is bright; the undertow is not."
      : summaryFor(label, vector);

  return {
    vector,
    axes,
    label,
    summary,
    evidence: anchorEvidence(trimmed, evidence),
    ambiguity: ambiguityParts.length > 0 ? ambiguityParts.join("; ") : null,
  };
}

function buildEvidence(text: string, sentences: string[], vector: AffectVector): Evidence[] {
  if (sentences.length === 0) {
    return [];
  }

  const signals = sentences.map((sentence) => ({
    sentence,
    signal: sentenceSignal(sentence),
  }));

  const axisToSet: Record<Axis, Set<string>> = {
    valence: NEGATIVE,
    arousal: ANGER,
    dominance: ASSERTION,
    tension: TENSION,
    warmth: WARM,
    certainty: HEDGES,
  };

  return AXES.map((axis) => {
    const sorted = [...signals].sort((a, b) => b.signal[axis] - a.signal[axis]);
    const best = sorted[0]?.sentence ?? text;
    const tokens = tokensOf(best);
    const words = matched(tokens, axisToSet[axis], 2);
    const quote = truncateWords(best, 14);

    let why = "the strongest local signal for this axis";
    if (axis === "valence" && words.length > 0) {
      why = `negative cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "valence" && vector.valence > 0.6) {
      why = "the sentence carries the warmest vocabulary";
    } else if (axis === "arousal" && words.length > 0) {
      why = `high-activation cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "dominance" && words.length > 0) {
      why = `assertive cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "tension" && words.length > 0) {
      why = `friction cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "warmth" && words.length > 0) {
      why = `social warmth cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "certainty" && words.length > 0) {
      why = `hedging cues: ${words.map((word) => `“${word}”`).join(", ")}`;
    } else if (axis === "certainty") {
      why = "little hedging; the sentence states rather than suggests";
    }

    return { axis, quote, why };
  });
}

export function heuristicReading(text: string): Reading {
  const trimmed = text.trim();
  const analysis = analyze(trimmed);
  return {
    id: `spec-${hashText(`${trimmed}:heuristic`)}`,
    version: "heuristic.v1",
    source: "heuristic",
    language: detectLanguage(trimmed),
    text: trimmed,
    label: analysis.label,
    summary: analysis.summary,
    axes: analysis.axes,
    evidence: analysis.evidence,
    ambiguity: analysis.ambiguity,
    trace: makeTrace(trimmed),
  };
}

function sentenceDistance(a: AffectVector, b: AffectVector): number {
  return AXES.reduce((sum, axis) => sum + Math.abs(a[axis] - b[axis]), 0) / AXES.length;
}

function vectorOf(text: string): AffectVector {
  return analyze(text).vector;
}

export function segmentIntoBeats(text: string, maxBeats = 12): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return [text.trim()];

  type Group = { sentences: string[]; vector: AffectVector; words: number };
  const targetBeats = Math.min(
    maxBeats,
    Math.max(1, Math.ceil(sentences.length / 2)),
  );

  const groups: Group[] = sentences.map((sentence) => ({
    sentences: [sentence],
    vector: vectorOf(sentence),
    words: tokensOf(sentence).length,
  }));

  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < groups.length - 1; index += 1) {
      const current = groups[index];
      const next = groups[index + 1];
      const distance = sentenceDistance(current.vector, next.vector);
      const combined = current.words + next.words;
      if (
        (distance < 0.16 && combined < 42) ||
        (current.words < 4 && distance < 0.3)
      ) {
        const joined = `${current.sentences.join(" ")} ${next.sentences.join(" ")}`;
        groups[index] = {
          sentences: [...current.sentences, ...next.sentences],
          vector: vectorOf(joined),
          words: combined,
        };
        groups.splice(index + 1, 1);
        changed = true;
        break;
      }
    }
  }

  while (groups.length < targetBeats) {
    let largest = 0;
    for (let index = 1; index < groups.length; index += 1) {
      if (groups[index].sentences.length > groups[largest].sentences.length) {
        largest = index;
      }
    }
    const group = groups[largest];
    if (group.sentences.length < 2) break;
    const half = Math.ceil(group.sentences.length / 2);
    const firstSentences = group.sentences.slice(0, half);
    const secondSentences = group.sentences.slice(half);
    const first: Group = {
      sentences: firstSentences,
      vector: vectorOf(firstSentences.join(" ")),
      words: firstSentences.reduce((sum, sentence) => sum + tokensOf(sentence).length, 0),
    };
    const second: Group = {
      sentences: secondSentences,
      vector: vectorOf(secondSentences.join(" ")),
      words: secondSentences.reduce((sum, sentence) => sum + tokensOf(sentence).length, 0),
    };
    groups.splice(largest, 1, first, second);
  }

  while (groups.length > maxBeats) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < groups.length - 1; index += 1) {
      const distance = sentenceDistance(groups[index].vector, groups[index + 1].vector);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const current = groups[bestIndex];
    const next = groups[bestIndex + 1];
    const joined = `${current.sentences.join(" ")} ${next.sentences.join(" ")}`;
    groups[bestIndex] = {
      sentences: [...current.sentences, ...next.sentences],
      vector: vectorOf(joined),
      words: current.words + next.words,
    };
    groups.splice(bestIndex + 1, 1);
  }

  return groups.map((group) => group.sentences.join(" "));
}

function arcFromLabels(labels: ReadingLabel[]): string {
  const words: string[] = [];
  for (const label of labels) {
    const word = labelToArcWord(label);
    if (words[words.length - 1] !== word) words.push(word);
  }
  const compact = words.length > 5 ? [words[0], ...words.slice(-4)] : words;
  return compact.join(" → ");
}

export function heuristicPerformance(text: string): Performance {
  const trimmed = text.trim();
  const document = heuristicReading(trimmed);
  const quotes = segmentIntoBeats(trimmed);
  let cursor = 0;

  const beats: Beat[] = quotes.map((quote, index) => {
    const analysis = analyze(quote);
    const anchor = anchorQuote(trimmed, quote, cursor);
    if (anchor.anchored) cursor = anchor.end;
    const confidence = averageConfidence(analysis.axes);
    return {
      id: `b${index + 1}`,
      quote,
      start: anchor.start,
      end: anchor.end,
      axes: analysis.axes,
      label: analysis.label,
      confidence,
      evidence: analysis.evidence,
      note: analysis.ambiguity,
    };
  });

  return {
    id: `read-${hashText(`${trimmed}:heuristic`)}`,
    version: "heuristic.v1",
    source: "heuristic",
    language: document.language,
    text: trimmed,
    document,
    beats,
    arc: arcFromLabels(beats.map((beat) => beat.label)),
    trace: document.trace,
  };
}

export function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  const italian = [
    " il ",
    " la ",
    " che ",
    " non ",
    " per ",
    " una ",
    " sono ",
    " questo ",
    " anche ",
    " più ",
    " perché ",
    " grazie ",
    " buongiorno ",
  ].filter((token) => lower.includes(token)).length;
  const english = [
    " the ",
    " and ",
    " that ",
    " this ",
    " with ",
    " have ",
    " not ",
    " you ",
    " for ",
    " just ",
    " because ",
    " want ",
  ].filter((token) => lower.includes(token)).length;
  return italian > english ? "it" : "en";
}

export function heuristicSpecimenId(text: string): string {
  return `spec-${hashText(text)}`;
}
