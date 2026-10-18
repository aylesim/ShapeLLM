import { anchorQuote } from "./anchor";
import { heuristicReading, heuristicSpecimenId } from "./heuristic";
import {
  AXES,
  clamp01,
  type AffectVector,
  type Axis,
  type AxisReading,
  type Beat,
  type Performance,
  type Reading,
  type ReadingLabel,
  type Trace,
} from "./types";

function curatedTrace(text: string): Trace {
  return {
    requestId: `curated-${heuristicSpecimenId(text).replace("spec-", "")}`,
    provider: "curated",
    model: "curated.v1",
    promptVersion: "curated.v1",
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    cached: true,
    repaired: false,
    route: "curated",
  };
}

function curatedReading(
  text: string,
  overrides: {
    label?: ReadingLabel;
    summary?: string;
    axes?: Partial<Record<Axis, number>>;
  } = {},
): Reading {
  const base = heuristicReading(text);
  const vector: AffectVector = {
    ...Object.fromEntries(AXES.map((axis) => [axis, base.axes[axis].value])),
    ...(overrides.axes ?? {}),
  } as AffectVector;

  const axes = Object.fromEntries(
    AXES.map((axis) => [
      axis,
      { value: clamp01(vector[axis]), confidence: base.axes[axis].confidence },
    ]),
  ) as Record<Axis, AxisReading>;

  return {
    ...base,
    id: heuristicSpecimenId(`${text}:curated`),
    source: "curated",
    version: "curated.v1",
    label: overrides.label ?? base.label,
    summary: overrides.summary ?? base.summary,
    axes,
    trace: curatedTrace(text),
  };
}

export type CuratedSpecimen = {
  id: string;
  title: string;
  text: string;
  reading: Reading;
};

const SERENE = `Just had a peaceful morning. Coffee, sunlight on the table, nowhere to be. I read two pages of a book I actually like and listened to the street wake up. Nothing happened. It was enough.`;

const IRONIC = `Great. Another delay. Love that for me. I especially enjoy standing on a platform at 7:40 in the morning, admiring the information board that says nothing at all. Truly world-class service.`;

const FURIOUS = `THAT'S IT. I AM ABSOLUTELY FURIOUS. I have asked three times, I have been ignored three times, and I will not tolerate this any longer. This is not a mistake anymore. This is a decision.`;

const CORPORATE = `Per our last conversation, I remain confident in the direction of the project. I would, however, like to flag that the timeline has moved twice without a corresponding update to the scope. I am sure this is simply an oversight.`;

const ITALIAN = `Va bene. Non importa. Davvero. Ho aspettato tutto il pomeriggio, ma evidentemente mi sono sbagliato. Non è la prima volta e probabilmente non sarà l'ultima. Buona serata.`;

const WARM = `Thank you for staying late to help me with this. I know it wasn't your job, and you did it anyway. I hope you get a quiet weekend, and I owe you a coffee.`;

export const CURATED_SPECIMENS: CuratedSpecimen[] = [
  {
    id: "spec-serene",
    title: "A morning with nowhere to be",
    text: SERENE,
    reading: curatedReading(SERENE, {
      label: "serene",
      summary:
        "A settled reading. Low activation, warm valence, and almost no friction: the text is not performing calm, it is resting in it.",
      axes: { valence: 0.78, arousal: 0.18, warmth: 0.72, tension: 0.12, certainty: 0.6 },
    }),
  },
  {
    id: "spec-warm",
    title: "A thank-you note",
    text: WARM,
    reading: curatedReading(WARM, {
      label: "warm",
      summary:
        "An open, generous reading. Gratitude is doing most of the work; the certainty stays soft, which makes it feel sincere rather than polished.",
      axes: { valence: 0.82, arousal: 0.28, warmth: 0.88, tension: 0.1, certainty: 0.58 },
    }),
  },
  {
    id: "spec-ironic",
    title: "Platform 7:40",
    text: IRONIC,
    reading: curatedReading(IRONIC, {
      label: "ironic",
      summary:
        "The words and the stance do not match. The surface is bright, the undertow is not; the praise is the complaint.",
      axes: { valence: 0.22, arousal: 0.62, dominance: 0.58, tension: 0.7, warmth: 0.18, certainty: 0.66 },
    }),
  },
  {
    id: "spec-corporate",
    title: "Per our last conversation",
    text: CORPORATE,
    reading: curatedReading(CORPORATE, {
      label: "tense",
      summary:
        "A controlled, corporate reading. The confidence is high and the warmth is low; the politeness is doing the work of pressure.",
      axes: { valence: 0.34, arousal: 0.42, dominance: 0.68, tension: 0.62, warmth: 0.28, certainty: 0.74 },
    }),
  },
  {
    id: "spec-furious",
    title: "The third request",
    text: FURIOUS,
    reading: curatedReading(FURIOUS, {
      label: "furious",
      summary:
        "High activation, low warmth, strong assertion. The all-caps opening is not the peak; the closing decision is.",
      axes: { valence: 0.08, arousal: 0.94, dominance: 0.8, tension: 0.84, warmth: 0.04, certainty: 0.9 },
    }),
  },
  {
    id: "spec-italian",
    title: "Va bene. Non importa.",
    text: ITALIAN,
    reading: curatedReading(ITALIAN, {
      label: "melancholy",
      summary:
        "A low, quiet reading. The words are polite, but the certainty is low and the warmth has nowhere to go; this is disappointment that has stopped arguing.",
      axes: { valence: 0.28, arousal: 0.24, dominance: 0.32, tension: 0.38, warmth: 0.36, certainty: 0.42 },
    }),
  },
];

export const SAMPLE_TEXTS = [
  { label: "Calm", text: SERENE },
  { label: "Ironic", text: IRONIC },
  { label: "Furious", text: FURIOUS },
  { label: "Corporate", text: CORPORATE },
  { label: "Italiano", text: ITALIAN },
];

export const RESERVATION_TEXT = `I wanted to write to you while I was still calm.

When I booked the table three weeks ago, I was told it would be by the window. I confirmed the time. I confirmed the date. I even received a reminder that morning.

We arrived at seven. The host looked at the screen for a long time. Then she said, very kindly, that there had been a mistake. There was no table by the window. There was no table at all.

I stayed polite. I said I understood. I said these things happen. I asked if there was anything else. She offered us a seat at the bar, next to the kitchen door, and she smiled as if this were a small, amusing story.

I want to be clear: I did not raise my voice. I did not make a scene. I simply asked how a confirmation could mean nothing.

She said the system sometimes does this. Sometimes. As if a system that "sometimes" erases a reservation were weather, and not a choice.

We left. On the way home I kept thinking about the reminder. The cheerful little reminder. The one that said they were looking forward to seeing us.

I am not furious because a table was lost. I am furious because no one seemed to think it mattered. Because the smile was supposed to be enough. Because "sometimes" was supposed to close the subject.

I would like an answer. Not an apology. An answer.

But I already know how this ends. I will send this. Someone will reply with a template. And I will be calm again, because that is what you learn to do.

Still. I wanted you to know that I noticed.`;

type ManualBeat = {
  quote: string;
  label: ReadingLabel;
  values: [number, number, number, number, number, number];
  confidence: number;
  note?: string | null;
};

const RESERVATION_BEATS: ManualBeat[] = [
  {
    quote: "I wanted to write to you while I was still calm.",
    label: "neutral",
    values: [0.58, 0.22, 0.48, 0.18, 0.55, 0.62],
    confidence: 0.82,
  },
  {
    quote:
      "When I booked the table three weeks ago, I was told it would be by the window. I confirmed the time. I confirmed the date. I even received a reminder that morning.",
    label: "neutral",
    values: [0.56, 0.2, 0.54, 0.15, 0.58, 0.8],
    confidence: 0.84,
  },
  {
    quote:
      "We arrived at seven. The host looked at the screen for a long time. Then she said, very kindly, that there had been a mistake. There was no table by the window. There was no table at all.",
    label: "uneasy",
    values: [0.34, 0.4, 0.35, 0.55, 0.3, 0.6],
    confidence: 0.8,
  },
  {
    quote:
      "I stayed polite. I said I understood. I said these things happen. I asked if there was anything else. She offered us a seat at the bar, next to the kitchen door, and she smiled as if this were a small, amusing story.",
    label: "tense",
    values: [0.4, 0.45, 0.42, 0.66, 0.4, 0.55],
    confidence: 0.78,
  },
  {
    quote:
      "I want to be clear: I did not raise my voice. I did not make a scene. I simply asked how a confirmation could mean nothing.",
    label: "frustrated",
    values: [0.26, 0.6, 0.62, 0.72, 0.22, 0.7],
    confidence: 0.82,
  },
  {
    quote:
      'She said the system sometimes does this. Sometimes. As if a system that "sometimes" erases a reservation were weather, and not a choice.',
    label: "furious",
    values: [0.16, 0.76, 0.66, 0.82, 0.12, 0.74],
    confidence: 0.86,
    note: "The repetition of “sometimes” turns a system excuse into a moral accusation.",
  },
  {
    quote:
      "We left. On the way home I kept thinking about the reminder. The cheerful little reminder. The one that said they were looking forward to seeing us.",
    label: "furious",
    values: [0.2, 0.7, 0.55, 0.78, 0.18, 0.66],
    confidence: 0.84,
  },
  {
    quote:
      'I am not furious because a table was lost. I am furious because no one seemed to think it mattered. Because the smile was supposed to be enough. Because "sometimes" was supposed to close the subject.',
    label: "furious",
    values: [0.1, 0.86, 0.74, 0.9, 0.06, 0.82],
    confidence: 0.9,
  },
  {
    quote: "I would like an answer. Not an apology. An answer.",
    label: "tense",
    values: [0.24, 0.62, 0.78, 0.7, 0.2, 0.86],
    confidence: 0.86,
  },
  {
    quote:
      "But I already know how this ends. I will send this. Someone will reply with a template. And I will be calm again, because that is what you learn to do.",
    label: "melancholy",
    values: [0.28, 0.3, 0.4, 0.45, 0.35, 0.5],
    confidence: 0.8,
  },
  {
    quote: "Still. I wanted you to know that I noticed.",
    label: "melancholy",
    values: [0.34, 0.24, 0.4, 0.3, 0.42, 0.56],
    confidence: 0.78,
  },
];

function axesFromValues(
  values: [number, number, number, number, number, number],
  confidence: number,
): Record<Axis, AxisReading> {
  return Object.fromEntries(
    AXES.map((axis, index) => [
      axis,
      { value: clamp01(values[index]), confidence },
    ]),
  ) as Record<Axis, AxisReading>;
}

function buildReservationPerformance(): Performance {
  let cursor = 0;
  const beats: Beat[] = RESERVATION_BEATS.map((beat, index) => {
    const anchor = anchorQuote(RESERVATION_TEXT, beat.quote, cursor);
    if (anchor.anchored) cursor = anchor.end;
    return {
      id: `b${index + 1}`,
      quote: beat.quote,
      start: anchor.start,
      end: anchor.end,
      axes: axesFromValues(beat.values, beat.confidence),
      label: beat.label,
      confidence: beat.confidence,
      evidence: [],
      note: beat.note ?? null,
    };
  });

  const documentAxes = axesFromValues([0.25, 0.58, 0.55, 0.7, 0.28, 0.7], 0.84);
  const trace: Trace = {
    requestId: "curated-reservation",
    provider: "curated",
    model: "curated.v1",
    promptVersion: "curated.v1",
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    cached: true,
    repaired: false,
    route: "curated",
  };

  const document: Reading = {
    id: "read-reservation",
    version: "curated.v1",
    source: "curated",
    language: "en",
    text: RESERVATION_TEXT,
    label: "frustrated",
    summary:
      "A controlled complaint that starts polite, tightens around being dismissed, and ends in resigned anger. The peak is not the loudest line; it is the quiet one about the reminder.",
    axes: documentAxes,
    evidence: [
      {
        axis: "tension",
        quote: "Because the smile was supposed to be enough.",
        why: "the politeness itself becomes the accusation",
        anchored: true,
      },
    ],
    ambiguity: null,
    trace,
  };

  return {
    id: "read-reservation",
    version: "curated.v1",
    source: "curated",
    language: "en",
    text: RESERVATION_TEXT,
    document,
    beats,
    arc: "calm → unease → friction → explosion → resignation",
    trace,
  };
}

export const CURATED_PERFORMANCE: Performance = buildReservationPerformance();

export const PERFORMANCE_SAMPLE = {
  title: "The Reservation",
  subtitle: "An eleven-beat reading of a complaint that starts polite and ends elsewhere.",
  text: RESERVATION_TEXT,
  performance: CURATED_PERFORMANCE,
};

export type FailureCase = {
  text: string;
  human: string;
  note: string;
};

export const FAILURE_GALLERY: FailureCase[] = [
  {
    text: IRONIC,
    human: "Ironic, frustrated. The praise is a complaint.",
    note: "Surface-positive vocabulary can dominate a bag-of-words reading. The local preview often misses the reversal.",
  },
  {
    text: "I'm not angry. I'm just disappointed.",
    human: "Controlled disappointment, with anger underneath.",
    note: "Negation flips the surface. A word-level model reads “angry” and moves on.",
  },
  {
    text: CORPORATE,
    human: "Passive-aggressive pressure dressed as confidence.",
    note: "Politeness and high certainty look positive in isolation. The tension lives in the frame, not the words.",
  },
];

export const LAB_NOTES = {
  dataset: "seed set · 12 texts · English and Italian",
  raters: "single-author seed labels (to be replaced by a 3-rater panel)",
  split: "no train/test split yet — this is a baseline, not a claim",
};
