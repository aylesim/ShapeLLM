"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ApiKeySection, {
  useDebouncedEvaluate,
  useLlmSettings,
} from "./ApiKeySection";
import {
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  FIELD_CLASS,
  PANEL_CLASS,
} from "@/app/styles";

type AngryCanvasComponent = typeof import("./AngryCanvas").default;

function CanvasPlaceholder() {
  return (
    <div className="flex min-h-[22rem] flex-1 items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--canvas-bg)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
      Loading 3D…
    </div>
  );
}

type Status = "idle" | "scoring" | "error";

const SAMPLE_TEXTS = [
  "Just had a peaceful morning, everything feels fine.",
  "I'm a little annoyed, but it's nothing serious.",
  "I can't believe they cancelled again. This is getting ridiculous.",
  "THAT'S IT. I AM ABSOLUTELY FURIOUS AND I WILL NOT TOLERATE THIS ANY LONGER!",
];

function StatusBlock({
  label,
  detail,
  ok,
}: {
  label: string;
  detail: string;
  ok?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-4 rounded border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6 sm:py-5">
      <span
        className={`h-3 w-3 shrink-0 rounded-full sm:h-4 sm:w-4 ${ok ? "bg-[var(--border-strong)]" : "bg-[var(--border)]"}`}
      />
      <div className="min-w-0">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-[var(--fg-subtle)] sm:text-base">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-3xl font-semibold tabular-nums tracking-tight text-[var(--fg)] sm:text-4xl lg:text-5xl">
          {detail}
        </p>
      </div>
    </div>
  );
}

export default function AngryStudio() {
  const [text, setText] = useState(SAMPLE_TEXTS[0]);
  const { settings, setSettings, hydrated } = useLlmSettings();
  const [AngryCanvas, setAngryCanvas] = useState<AngryCanvasComponent | null>(null);
  const [targetAngry, setTargetAngry] = useState(0);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const evaluate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setTargetAngry(0);
      setDisplayScore(null);
      setStatus("idle");
      setError("");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setStatus("scoring");
    setError("");

    try {
      const res = await fetch("/api/angry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          openAiApiKey: settings.openAiApiKey || undefined,
          llmProvider: settings.llmProvider,
          llmModel: settings.llmModel,
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as { angry?: number; error?: string };

      if (requestId !== requestIdRef.current) return;

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Scoring failed");
        return;
      }

      const angry = typeof data.angry === "number" ? data.angry : 0;
      setTargetAngry(angry);
      setDisplayScore(angry);
      setStatus("idle");
    } catch (err) {
      if (controller.signal.aborted) return;
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Scoring failed");
    }
  }, [text, settings]);

  useDebouncedEvaluate(hydrated ? text : "", evaluate, 600);

  useEffect(() => {
    let active = true;
    import("./AngryCanvas").then((mod) => {
      if (active) setAngryCanvas(() => mod.default);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const statusDetail =
    status === "scoring"
      ? "scoring…"
      : status === "error"
        ? "error"
        : displayScore !== null
          ? displayScore.toFixed(2)
          : "none";

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Studio
        </p>
        <h2 className="mt-1 font-serif text-2xl leading-snug tracking-tight sm:text-[1.65rem]">
          Angry text shapes a 3D ball in near real time
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Type anything. An LLM scores how angry it feels from 0 (calm) to 1 (furious).
          The ball morphs sharper and redder as the score rises.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatusBlock label="anger" detail={statusDetail} ok={displayScore !== null && status !== "error"} />
        <StatusBlock label="llm" detail={status === "scoring" ? "busy" : "ready"} ok={status !== "scoring"} />
      </div>

      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <section className={`${PANEL_CLASS} flex flex-col`}>
            <div className="border-b border-[var(--border)] pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                Text
              </p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Write something angry…"
              className={`${FIELD_CLASS} mt-2.5 min-h-[14rem] resize-y font-serif text-lg leading-relaxed sm:text-xl`}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={evaluate} className={BUTTON_PRIMARY_CLASS}>
                Evaluate
              </button>
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setTargetAngry(0);
                  setDisplayScore(null);
                  setError("");
                  setStatus("idle");
                }}
                className={BUTTON_SECONDARY_CLASS}
              >
                Clear
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SAMPLE_TEXTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setText(sample)}
                  className="rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                >
                  sample
                </button>
              ))}
            </div>
          </section>

          <div className="flex min-h-0 flex-col md:sticky md:top-5 md:self-stretch">
            <section className={`${PANEL_CLASS} flex flex-1 flex-col p-0`}>
              <div className="border-b border-[var(--border)] px-2.5 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                  Shape
                </p>
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                {AngryCanvas ? (
                  <AngryCanvas targetAngry={targetAngry} />
                ) : (
                  <CanvasPlaceholder />
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {hydrated ? (
            <ApiKeySection settings={settings} onChange={setSettings} />
          ) : (
            <div className={PANEL_CLASS} aria-hidden="true">
              <div className="border-b border-[var(--border)] pb-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                  LLM
                </p>
              </div>
              <div className="mt-2.5 h-24 animate-pulse rounded bg-[var(--surface-raised)]" />
            </div>
          )}

          <section className={PANEL_CLASS}>
            <div className="border-b border-[var(--border)] pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                Meter
              </p>
            </div>
            <div className="mt-2.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--fg-subtle)]">
                <span>calm</span>
                <span>angry</span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface-raised)]">
                <div
                  className="h-full bg-[var(--inverse-bg)] transition-[width] duration-300 ease-out"
                  style={{ width: `${(displayScore ?? 0) * 100}%` }}
                />
              </div>
              {error ? (
                <p className="mt-2 font-mono text-[10px] text-[var(--error-fg)]">{error}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
