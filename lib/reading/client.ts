import { heuristicPerformance, heuristicReading } from "./heuristic";
import type { LlmSettings } from "./settings";
import type { LlmProvider, ModelOption } from "../llm/models";
import type { Performance, Reading } from "./types";

export type Health = {
  live: boolean;
  provider: LlmProvider;
  promptVersion: string;
  models: Record<LlmProvider, ModelOption[]>;
};

export class ReadingError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "READING_FAILED", status = 500) {
    super(message);
    this.name = "ReadingError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<Health | null> {
  try {
    const response = await fetch("/api/health", { signal, cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as Health;
  } catch {
    return null;
  }
}

export type InterpretResult<T> = {
  data: T;
  warning: string | null;
  usedLive: boolean;
};

type ApiResponse = {
  reading?: Reading;
  performance?: Performance;
  error?: string;
  code?: string;
};

async function postScore(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  const response = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  let payload: ApiResponse = {};
  try {
    payload = (await response.json()) as ApiResponse;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new ReadingError(
      payload.error ?? "The reading failed.",
      payload.code ?? "READING_FAILED",
      response.status,
    );
  }
  return payload;
}

function requestBody(text: string, settings: LlmSettings, mode: "single" | "reading") {
  return {
    text,
    mode,
    provider: settings.provider,
    model: settings.model || undefined,
    apiKey: settings.apiKey.trim() || undefined,
  };
}

export async function interpretText(
  text: string,
  settings: LlmSettings,
  options: { live: boolean; signal?: AbortSignal },
): Promise<InterpretResult<Reading>> {
  const trimmed = text.trim();
  if (!trimmed) throw new ReadingError("Write something first.", "EMPTY_TEXT", 400);

  if (!options.live && !settings.apiKey.trim()) {
    return { data: heuristicReading(trimmed), warning: null, usedLive: false };
  }

  try {
    const payload = await postScore(
      requestBody(trimmed, settings, "single"),
      options.signal,
    );
    if (!payload.reading) {
      throw new ReadingError("The model returned an empty reading.", "EMPTY_READING", 502);
    }
    return { data: payload.reading, warning: null, usedLive: true };
  } catch (error) {
    if (error instanceof ReadingError) {
      if (error.status === 400) throw error;
      if (error.status === 401) {
        return { data: heuristicReading(trimmed), warning: null, usedLive: false };
      }
    }
    if (options.signal?.aborted) throw error;
    return {
      data: heuristicReading(trimmed),
      warning: "Live model unavailable — showing the local preview.",
      usedLive: false,
    };
  }
}

export async function interpretPerformance(
  text: string,
  settings: LlmSettings,
  options: { live: boolean; signal?: AbortSignal },
): Promise<InterpretResult<Performance>> {
  const trimmed = text.trim();
  if (!trimmed) throw new ReadingError("Write something first.", "EMPTY_TEXT", 400);

  if (!options.live && !settings.apiKey.trim()) {
    return { data: heuristicPerformance(trimmed), warning: null, usedLive: false };
  }

  try {
    const payload = await postScore(
      requestBody(trimmed, settings, "reading"),
      options.signal,
    );
    if (!payload.performance) {
      throw new ReadingError(
        "The model returned an empty performance.",
        "EMPTY_READING",
        502,
      );
    }
    return { data: payload.performance, warning: null, usedLive: true };
  } catch (error) {
    if (error instanceof ReadingError) {
      if (error.status === 400) throw error;
      if (error.status === 401) {
        return {
          data: heuristicPerformance(trimmed),
          warning: null,
          usedLive: false,
        };
      }
    }
    if (options.signal?.aborted) throw error;
    return {
      data: heuristicPerformance(trimmed),
      warning: "Live model unavailable — showing the local preview.",
      usedLive: false,
    };
  }
}
