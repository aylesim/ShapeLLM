import { createHash, randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { anchorBeats, anchorEvidence, beatCoverage } from "../reading/anchor";
import { heuristicReading } from "../reading/heuristic";
import { labelFor, summaryFor } from "../reading/palette";
import {
  AXES,
  LABELS,
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
} from "../reading/types";
import { DEFAULT_MODEL, MODEL_OPTIONS, type LlmProvider } from "./models";
import {
  PROMPT_VERSION,
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "./prompt";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const CACHE_LIMIT = 120;

const AxisValueSchema = z.object({
  value: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

const AxesSchema = z.object({
  valence: AxisValueSchema,
  arousal: AxisValueSchema,
  dominance: AxisValueSchema,
  tension: AxisValueSchema,
  warmth: AxisValueSchema,
  certainty: AxisValueSchema,
});

const EvidenceSchema = z.object({
  axis: z.enum(AXES),
  quote: z.string().min(1).max(500),
  why: z.string().max(300),
});

const ReadingPayloadSchema = z.object({
  language: z.string().min(2).max(16),
  label: z.enum(LABELS),
  summary: z.string().min(1).max(320),
  axes: AxesSchema,
  evidence: z.array(EvidenceSchema).max(18),
  ambiguity: z.string().max(320).nullable(),
});

const BeatPayloadSchema = z.object({
  quote: z.string().min(1).max(900),
  label: z.enum(LABELS),
  axes: AxesSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(EvidenceSchema).max(6),
  note: z.string().max(320).nullable(),
});

const PerformancePayloadSchema = ReadingPayloadSchema.extend({
  arc: z.string().min(1).max(220),
  beats: z.array(BeatPayloadSchema).min(1).max(20),
});

type ReadingPayload = z.infer<typeof ReadingPayloadSchema>;
type BeatPayload = z.infer<typeof BeatPayloadSchema>;
type PerformancePayload = z.infer<typeof PerformancePayloadSchema>;

export class LlmError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "LLM_ERROR", status = 502) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.status = status;
  }
}

type CacheEntry =
  | { kind: "reading"; value: Reading }
  | { kind: "performance"; value: Performance };

const cache = new Map<string, CacheEntry>();

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function cacheGet(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  cache.delete(key);
  cache.set(key, entry);
  if (entry.kind === "reading") {
    entry.value.trace.cached = true;
  } else {
    entry.value.trace.cached = true;
  }
  return entry;
}

function cacheSet(key: string, entry: CacheEntry): void {
  cache.set(key, entry);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export function hasServerKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim(),
  );
}

export function resolveProvider(requested?: string | null): LlmProvider {
  if (requested === "openai" || requested === "openrouter") return requested;
  return process.env.LLM_PROVIDER === "openrouter" ? "openrouter" : "openai";
}

export function resolveModel(provider: LlmProvider, requested?: string | null): string {
  const trimmed = requested?.trim();
  if (trimmed) return trimmed;
  const env = provider === "openrouter"
    ? process.env.OPENROUTER_MODEL?.trim() || process.env.OPENAI_MODEL?.trim()
    : process.env.OPENAI_MODEL?.trim();
  return env || DEFAULT_MODEL[provider];
}

function resolveKey(provider: LlmProvider, requested?: string | null): string {
  const trimmed = requested?.trim();
  if (trimmed) return trimmed;
  const env = provider === "openrouter"
    ? process.env.OPENROUTER_API_KEY?.trim()
    : process.env.OPENAI_API_KEY?.trim();
  if (!env) {
    throw new LlmError(
      `No API key configured for ${provider}. Add a key in the model panel or set ${
        provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY"
      }.`,
      "MISSING_API_KEY",
      401,
    );
  }
  return env;
}

function createClient(provider: LlmProvider, apiKey: string): OpenAI {
  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey,
    timeout: 45_000,
    maxRetries: 0,
  };

  if (provider === "openrouter") {
    config.baseURL = OPENROUTER_BASE_URL;
    config.defaultHeaders = {
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.OPENROUTER_HTTP_REFERER
        ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
        : {}),
      "X-OpenRouter-Title": process.env.OPENROUTER_APP_TITLE?.trim() || "ShapeLLM",
    };
  }

  return new OpenAI(config);
}

const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = PRICE_TABLE[model] ?? { input: 0.5, output: 1.5 };
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

function parseJson(raw: string): unknown {
  const withoutFences = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  const slice = start >= 0 && end > start ? withoutFences.slice(start, end + 1) : withoutFences;
  return JSON.parse(slice);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrap(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  return asRecord(record.reading ?? record.performance ?? record.data ?? record);
}

function normalizeAxisValue(value: unknown, fallback: number): AxisReading {
  if (typeof value === "number") {
    return { value: clamp01(value), confidence: 0.6 };
  }
  const record = asRecord(value);
  const rawValue = typeof record.value === "number" ? record.value : fallback;
  const rawConfidence =
    typeof record.confidence === "number" ? record.confidence : 0.62;
  return { value: clamp01(rawValue), confidence: clamp01(rawConfidence) };
}

function vectorFromAxes(axes: Record<Axis, AxisReading>): AffectVector {
  return Object.fromEntries(
    AXES.map((axis) => [axis, axes[axis].value]),
  ) as AffectVector;
}

function normalizeAxes(raw: unknown, fallbackAxes: Record<Axis, AxisReading>): Record<Axis, AxisReading> {
  const record = asRecord(raw);
  return Object.fromEntries(
    AXES.map((axis) => [
      axis,
      normalizeAxisValue(record[axis], fallbackAxes[axis].value),
    ]),
  ) as Record<Axis, AxisReading>;
}

function normalizeEvidence(raw: unknown): Evidence[] {
  if (!Array.isArray(raw)) return [];
  const output: Evidence[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const axis = record.axis;
    const quote = typeof record.quote === "string" ? record.quote.trim() : "";
    if (
      typeof axis !== "string" ||
      !AXES.includes(axis as Axis) ||
      quote.length === 0
    ) {
      continue;
    }
    output.push({
      axis: axis as Axis,
      quote: quote.slice(0, 400),
      why:
        typeof record.why === "string" && record.why.trim()
          ? record.why.trim().slice(0, 220)
          : "the strongest local cue for this axis",
    });
    if (output.length >= 18) break;
  }
  return output;
}

function normalizeLabel(raw: unknown, vector: AffectVector): ReadingLabel {
  const value = typeof raw === "string" ? raw.toLowerCase().trim() : "";
  return (LABELS as readonly string[]).includes(value)
    ? (value as ReadingLabel)
    : labelFor(vector);
}

function normalizeReadingPayload(
  raw: Record<string, unknown>,
  text: string,
): ReadingPayload {
  const fallback = heuristicReading(text);
  const axes = normalizeAxes(raw.axes, fallback.axes);
  const vector = vectorFromAxes(axes);
  const label = normalizeLabel(raw.label, vector);
  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, 300)
      : summaryFor(label, vector);

  return ReadingPayloadSchema.parse({
    language:
      typeof raw.language === "string" && raw.language.trim()
        ? raw.language.trim().slice(0, 16)
        : fallback.language,
    label,
    summary,
    axes,
    evidence: normalizeEvidence(raw.evidence),
    ambiguity:
      typeof raw.ambiguity === "string" && raw.ambiguity.trim()
        ? raw.ambiguity.trim().slice(0, 300)
        : null,
  });
}

function arcFromBeats(beats: BeatPayload[]): string {
  const words: string[] = [];
  for (const beat of beats) {
    const word = labelToArcWord(beat.label);
    if (words[words.length - 1] !== word) words.push(word);
  }
  return (words.length > 5 ? [words[0], ...words.slice(-4)] : words).join(" → ");
}

function normalizePerformancePayload(
  raw: Record<string, unknown>,
  text: string,
): PerformancePayload {
  const fallback = heuristicReading(text);
  const documentAxes = normalizeAxes(raw.axes, fallback.axes);
  const documentVector = vectorFromAxes(documentAxes);
  const documentLabel = normalizeLabel(raw.label, documentVector);

  const rawBeats = Array.isArray(raw.beats) ? raw.beats : [];
  const beats: BeatPayload[] = [];
  for (const item of rawBeats.slice(0, 20)) {
    const record = asRecord(item);
    const quote = typeof record.quote === "string" ? record.quote.trim() : "";
    if (!quote) continue;
    const beatFallback = heuristicReading(quote);
    const axes = normalizeAxes(record.axes, beatFallback.axes);
    const vector = vectorFromAxes(axes);
    const label = normalizeLabel(record.label, vector);
    const confidence =
      typeof record.confidence === "number"
        ? clamp01(record.confidence)
        : averageConfidence(axes);
    beats.push({
      quote: quote.slice(0, 900),
      label,
      axes,
      confidence,
      evidence: normalizeEvidence(record.evidence),
      note:
        typeof record.note === "string" && record.note.trim()
          ? record.note.trim().slice(0, 300)
          : null,
    });
  }

  const arc =
    typeof raw.arc === "string" && raw.arc.trim()
      ? raw.arc.trim().slice(0, 200)
      : arcFromBeats(beats);

  return PerformancePayloadSchema.parse({
    language:
      typeof raw.language === "string" && raw.language.trim()
        ? raw.language.trim().slice(0, 16)
        : fallback.language,
    label: documentLabel,
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim().slice(0, 300)
        : summaryFor(documentLabel, documentVector),
    axes: documentAxes,
    evidence: normalizeEvidence(raw.evidence),
    ambiguity:
      typeof raw.ambiguity === "string" && raw.ambiguity.trim()
        ? raw.ambiguity.trim().slice(0, 300)
        : null,
    arc,
    beats,
  });
}

function buildTrace(options: {
  provider: LlmProvider;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cached: boolean;
  repaired: boolean;
  route: string;
}): Trace {
  return {
    requestId: `req_${randomUUID().slice(0, 8)}`,
    provider: options.provider,
    model: options.model,
    promptVersion: PROMPT_VERSION,
    latencyMs: options.latencyMs,
    tokensIn: options.tokensIn,
    tokensOut: options.tokensOut,
    costUsd: estimateCost(options.model, options.tokensIn, options.tokensOut),
    cached: options.cached,
    repaired: options.repaired,
    route: options.route,
  };
}

function readingFromPayload(payload: ReadingPayload, text: string, trace: Trace): Reading {
  return {
    id: `spec-${hashText(`${text}:${trace.model}:${PROMPT_VERSION}`).slice(0, 6)}`,
    version: PROMPT_VERSION,
    source: "llm",
    language: payload.language,
    text,
    label: payload.label,
    summary: payload.summary,
    axes: payload.axes,
    evidence: anchorEvidence(text, payload.evidence),
    ambiguity: payload.ambiguity,
    trace,
  };
}

function performanceFromPayload(
  payload: PerformancePayload,
  text: string,
  trace: Trace,
): Performance {
  const anchors = anchorBeats(
    text,
    payload.beats.map((beat) => beat.quote),
  );
  const beats: Beat[] = payload.beats.map((beat, index) => {
    const anchor = anchors[index] ?? { start: 0, end: 0, anchored: false };
    return {
      id: `b${index + 1}`,
      quote: beat.quote,
      start: anchor.start,
      end: anchor.end,
      axes: beat.axes,
      label: beat.label,
      confidence: beat.confidence,
      evidence: anchorEvidence(text, beat.evidence),
      note: beat.note,
    };
  });

  const coverage = beatCoverage(text, beats);
  if (beats.length < 2 || coverage < 0.5) {
    throw new LlmError(
      "The model returned beats that do not cover the text. Try again or use the local preview.",
      "INVALID_BEATS",
      502,
    );
  }

  const document: Reading = {
    id: `read-${hashText(`${text}:${trace.model}:${PROMPT_VERSION}`).slice(0, 6)}`,
    version: PROMPT_VERSION,
    source: "llm",
    language: payload.language,
    text,
    label: payload.label,
    summary: payload.summary,
    axes: payload.axes,
    evidence: anchorEvidence(text, payload.evidence),
    ambiguity: payload.ambiguity,
    trace,
  };

  return {
    id: document.id,
    version: PROMPT_VERSION,
    source: "llm",
    language: payload.language,
    text,
    document,
    beats,
    arc: payload.arc,
    trace,
  };
}

async function callModel(options: {
  client: OpenAI;
  model: string;
  mode: "single" | "reading";
  text: string;
  repair?: { raw: string; error: string };
}): Promise<{ raw: string; tokensIn: number; tokensOut: number }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(options.mode) },
    { role: "user", content: buildUserPrompt(options.text) },
  ];

  if (options.repair) {
    messages.push({ role: "assistant", content: options.repair.raw });
    messages.push({
      role: "user",
      content: buildRepairPrompt(options.repair.raw, options.repair.error),
    });
  }

  const completion = await options.client.chat.completions.create({
    model: options.model,
    temperature: 0.2,
    max_tokens: options.mode === "reading" ? 4200 : 1100,
    response_format: { type: "json_object" },
    messages,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new LlmError("The model returned an empty response.", "EMPTY_RESPONSE", 502);
  }

  return {
    raw,
    tokensIn: completion.usage?.prompt_tokens ?? 0,
    tokensOut: completion.usage?.completion_tokens ?? 0,
  };
}

export async function scoreWithLlm(options: {
  text: string;
  mode: "single" | "reading";
  provider?: string | null;
  model?: string | null;
  apiKey?: string | null;
}): Promise<{ reading: Reading } | { performance: Performance }> {
  const text = options.text.trim();
  if (!text) throw new LlmError("Write something first.", "EMPTY_TEXT", 400);
  if (text.length > 6000) {
    throw new LlmError(
      "This text is too long for one reading. Keep it under 6,000 characters.",
      "TEXT_TOO_LONG",
      400,
    );
  }

  const provider = resolveProvider(options.provider);
  const model = resolveModel(provider, options.model);
  const apiKey = resolveKey(provider, options.apiKey);
  const cacheKey = `${provider}:${model}:${options.mode}:${PROMPT_VERSION}:${hashText(text)}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached.kind === "reading"
      ? { reading: cached.value }
      : { performance: cached.value };
  }

  const client = createClient(provider, apiKey);
  const startedAt = Date.now();
  let repaired = false;
  let tokensIn = 0;
  let tokensOut = 0;

  let callResult: { raw: string; tokensIn: number; tokensOut: number };
  try {
    callResult = await callModel({ client, model, mode: options.mode, text });
  } catch (error) {
    if (error instanceof LlmError) throw error;
    throw new LlmError(
      error instanceof Error ? error.message : "The model request failed.",
      "PROVIDER_ERROR",
      502,
    );
  }

  tokensIn += callResult.tokensIn;
  tokensOut += callResult.tokensOut;

  const finalize = (
    payload: ReadingPayload | PerformancePayload,
  ): { reading: Reading } | { performance: Performance } => {
    const trace = buildTrace({
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      tokensIn,
      tokensOut,
      cached: false,
      repaired,
      route: "direct",
    });
    if (options.mode === "reading") {
      const performance = performanceFromPayload(
        payload as PerformancePayload,
        text,
        trace,
      );
      cacheSet(cacheKey, { kind: "performance", value: performance });
      return { performance };
    }
    const reading = readingFromPayload(payload as ReadingPayload, text, trace);
    cacheSet(cacheKey, { kind: "reading", value: reading });
    return { reading };
  };

  try {
    const parsed = unwrap(parseJson(callResult.raw));
    const payload =
      options.mode === "reading"
        ? normalizePerformancePayload(parsed, text)
        : normalizeReadingPayload(parsed, text);
    return finalize(payload);
  } catch (firstError) {
    const message =
      firstError instanceof z.ZodError
        ? firstError.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : firstError instanceof Error
          ? firstError.message
          : "Invalid model output";

    try {
      callResult = await callModel({
        client,
        model,
        mode: options.mode,
        text,
        repair: { raw: callResult.raw, error: message },
      });
      tokensIn += callResult.tokensIn;
      tokensOut += callResult.tokensOut;
      repaired = true;
      const parsed = unwrap(parseJson(callResult.raw));
      const payload =
        options.mode === "reading"
          ? normalizePerformancePayload(parsed, text)
          : normalizeReadingPayload(parsed, text);
      return finalize(payload);
    } catch (secondError) {
      if (secondError instanceof LlmError) throw secondError;
      throw new LlmError(
        "The model returned invalid JSON twice. Try a different model or the local preview.",
        "INVALID_JSON",
        502,
      );
    }
  }
}

export { MODEL_OPTIONS, PROMPT_VERSION };
