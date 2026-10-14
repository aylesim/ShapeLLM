"use client";

import { useEffect, useRef, useState } from "react";
import type { LlmProvider } from "@/lib/llm-provider";
import { OPENAI_MODEL_OPTIONS, getDefaultLlmModel } from "@/lib/llm-models";
import {
  BUTTON_PRIMARY_COMPACT_CLASS,
  BUTTON_SECONDARY_COMPACT_CLASS,
  FIELD_COMPACT_CLASS,
  PANEL_CLASS,
} from "@/app/styles";

const LOCAL_STORAGE_OPENAI_KEY = "shapellm.openai-api-key.v1";
const LOCAL_STORAGE_LLM_PROVIDER_KEY = "shapellm.llm-provider.v1";
const LOCAL_STORAGE_LLM_MODEL_KEY = "shapellm.llm-model.v1";

const PROVIDER_LINKS: Record<LlmProvider, { href: string; label: string }> = {
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com" },
  openrouter: { href: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
};

export type LlmSettings = {
  openAiApiKey: string;
  llmProvider: LlmProvider;
  llmModel: string;
};

export function defaultLlmSettings(): LlmSettings {
  return {
    openAiApiKey: "",
    llmProvider: "openai",
    llmModel: getDefaultLlmModel("openai"),
  };
}

export function readLlmSettings(): LlmSettings {
  if (typeof window === "undefined") {
    return defaultLlmSettings();
  }

  const provider =
    (localStorage.getItem(LOCAL_STORAGE_LLM_PROVIDER_KEY) as LlmProvider) || "openai";
  const validProvider = provider === "openrouter" ? "openrouter" : "openai";
  const storedModel = localStorage.getItem(LOCAL_STORAGE_LLM_MODEL_KEY)?.trim();

  return {
    openAiApiKey: localStorage.getItem(LOCAL_STORAGE_OPENAI_KEY) ?? "",
    llmProvider: validProvider,
    llmModel: storedModel || getDefaultLlmModel(validProvider),
  };
}

export function useLlmSettings() {
  const [settings, setSettings] = useState<LlmSettings>(defaultLlmSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(readLlmSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistLlmSettings(settings);
  }, [settings, hydrated]);

  return { settings, setSettings, hydrated };
}

export function persistLlmSettings(settings: LlmSettings) {
  if (settings.openAiApiKey) {
    localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, settings.openAiApiKey);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_OPENAI_KEY);
  }
  localStorage.setItem(LOCAL_STORAGE_LLM_PROVIDER_KEY, settings.llmProvider);
  localStorage.setItem(LOCAL_STORAGE_LLM_MODEL_KEY, settings.llmModel);
}

type ApiKeySectionProps = {
  settings: LlmSettings;
  onChange: (next: LlmSettings) => void;
  showKeyGuide?: boolean;
};

export default function ApiKeySection({
  settings,
  onChange,
  showKeyGuide = false,
}: ApiKeySectionProps) {
  const [showKey, setShowKey] = useState(false);
  const link = PROVIDER_LINKS[settings.llmProvider];

  return (
    <section
      className={`${PANEL_CLASS}${showKeyGuide ? " ring-2 ring-[var(--border-strong)]" : ""}`}
      id="llm-api-key-section"
    >
      <div className="border-b border-[var(--border)] pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          LLM
        </p>
      </div>

      {showKeyGuide ? (
        <div
          className="mt-2.5 space-y-2 rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-2"
          role="status"
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fg)]">
            API key needed to score text
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--fg-muted)]">
            <li>Choose your provider (OpenAI or OpenRouter).</li>
            <li>
              Create a key at{" "}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--fg)]"
              >
                {link.label}
              </a>
              .
            </li>
            <li>Paste it in the Key field below — stored only in this browser.</li>
            <li>Scoring runs again automatically once the key is saved.</li>
          </ol>
        </div>
      ) : null}

      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="llm-provider" className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
            Provider
          </label>
          <select
            id="llm-provider"
            value={settings.llmProvider}
            onChange={(e) => {
              const llmProvider = e.target.value as LlmProvider;
              onChange({
                ...settings,
                llmProvider,
                llmModel: getDefaultLlmModel(llmProvider),
              });
            }}
            className={FIELD_COMPACT_CLASS}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="llm-model" className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
            Model
          </label>
          {settings.llmProvider === "openai" ? (
            <select
              id="llm-model"
              value={settings.llmModel}
              onChange={(e) => onChange({ ...settings, llmModel: e.target.value })}
              className={FIELD_COMPACT_CLASS}
            >
              {OPENAI_MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="llm-model"
              type="text"
              value={settings.llmModel}
              onChange={(e) => onChange({ ...settings, llmModel: e.target.value })}
              placeholder="openrouter/free"
              className={FIELD_COMPACT_CLASS}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="api-key" className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
            Key
          </label>
          <input
            id="api-key"
            type={showKey ? "text" : "password"}
            value={settings.openAiApiKey}
            onChange={(e) => onChange({ ...settings, openAiApiKey: e.target.value })}
            placeholder="API key"
            autoComplete="off"
            className={FIELD_COMPACT_CLASS}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className={BUTTON_SECONDARY_COMPACT_CLASS}
          >
            {showKey ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, openAiApiKey: "" })}
            className={BUTTON_SECONDARY_COMPACT_CLASS}
          >
            Clear
          </button>
        </div>

        <p className="font-mono text-[9px] text-[var(--fg-subtle)]">
          key opt.{" "}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {link.label}
          </a>
        </p>
      </div>
    </section>
  );
}

export function useDebouncedEvaluate(
  text: string,
  evaluate: () => void,
  delayMs = 600,
) {
  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;

  useEffect(() => {
    if (!text.trim()) return;
    const timer = window.setTimeout(() => evaluateRef.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, [text, delayMs]);
}
