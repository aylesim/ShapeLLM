"use client";

import { useState } from "react";
import {
  MODEL_OPTIONS,
  getDefaultModel,
  isLlmProvider,
  type LlmProvider,
} from "@/lib/llm/models";
import { maskKey, type LlmSettings } from "@/lib/reading/settings";
import type { Health } from "@/lib/reading/client";
import { Icon } from "@/app/components/ui/icons";

type SettingsPanelProps = {
  settings: LlmSettings;
  onChange: (next: LlmSettings) => void;
  hydrated: boolean;
  health: Health | null;
};

const PROVIDER_LINKS: Record<LlmProvider, { href: string; label: string }> = {
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com" },
  openrouter: { href: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
};

export function SettingsPanel({
  settings,
  onChange,
  hydrated,
  health,
}: SettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const providerLink = PROVIDER_LINKS[settings.provider];
  const usingServerKey = Boolean(health?.live);
  const usingOwnKey = Boolean(settings.apiKey.trim());
  const models = MODEL_OPTIONS[settings.provider];

  return (
    <details className="settings">
      <summary>
        <Icon name="settings" size={14} />
        <span className="mono-label">Model</span>
        <span className="settings-summary-model">
          {settings.model} · {usingServerKey ? "server key" : usingOwnKey ? "your key" : "local preview"}
        </span>
        <Icon name="chevron" size={14} />
      </summary>

      <div className="settings-body">
        <div className="settings-status">
          {usingServerKey
            ? "Server key active — live readings are on"
            : usingOwnKey
              ? "Your key is used for live readings"
              : "Local preview — add a key for live readings"}
        </div>

        <div className="settings-row">
          <label htmlFor="settings-provider" className="settings-label">
            Provider
          </label>
          <select
            id="settings-provider"
            className="field select"
            value={settings.provider}
            disabled={!hydrated}
            onChange={(event) => {
              const provider = isLlmProvider(event.target.value)
                ? event.target.value
                : "openai";
              onChange({
                ...settings,
                provider,
                model: getDefaultModel(provider),
              });
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="settings-row">
          <label htmlFor="settings-model" className="settings-label">
            Model
          </label>
          {settings.provider === "openai" ? (
            <select
              id="settings-model"
              className="field select"
              value={settings.model}
              disabled={!hydrated}
              onChange={(event) => onChange({ ...settings, model: event.target.value })}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                id="settings-model"
                className="field"
                list="settings-model-options"
                value={settings.model}
                disabled={!hydrated}
                onChange={(event) => onChange({ ...settings, model: event.target.value })}
                placeholder="openrouter/free"
              />
              <datalist id="settings-model-options">
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </datalist>
            </>
          )}
        </div>

        <div className="settings-row">
          <label htmlFor="settings-key" className="settings-label">
            Key
          </label>
          <div className="settings-key-row">
            <input
              id="settings-key"
              className="field"
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              disabled={!hydrated}
              autoComplete="off"
              placeholder={usingServerKey ? "Server key active" : "Paste a key"}
              onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
            />
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => setShowKey((current) => !current)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              <Icon name={showKey ? "eye" : "eye"} size={14} />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Storage</span>
          <label className="settings-inline">
            <input
              type="checkbox"
              checked={settings.remember}
              disabled={!hydrated}
              onChange={(event) =>
                onChange({ ...settings, remember: event.target.checked })
              }
            />
            Remember on this device
          </label>
        </div>

        <div className="settings-row">
          <span className="settings-label">Key</span>
          <div className="settings-inline" style={{ justifyContent: "space-between" }}>
            <span>{maskKey(settings.apiKey)}</span>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onChange({ ...settings, apiKey: "" })}
            >
              Clear
            </button>
          </div>
        </div>

        <p className="settings-note">
          Keys stay in this browser. A key is sent to this server only for the
          request that uses it, and is never logged. Get one at{" "}
          <a href={providerLink.href} target="_blank" rel="noopener noreferrer">
            {providerLink.label}
          </a>
          .
        </p>
      </div>
    </details>
  );
}
