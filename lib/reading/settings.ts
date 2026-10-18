"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDefaultModel,
  isLlmProvider,
  type LlmProvider,
} from "../llm/models";

export type LlmSettings = {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  remember: boolean;
};

const STORAGE_KEY = "shapellm.settings.v2";
const SESSION_KEY = "shapellm.session-key.v2";

export function defaultLlmSettings(): LlmSettings {
  return {
    provider: "openai",
    model: getDefaultModel("openai"),
    apiKey: "",
    remember: false,
  };
}

export function readLlmSettings(): LlmSettings {
  if (typeof window === "undefined") return defaultLlmSettings();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLlmSettings();
    const parsed = JSON.parse(raw) as Partial<LlmSettings>;
    const provider = isLlmProvider(parsed.provider) ? parsed.provider : "openai";
    const remember = Boolean(parsed.remember);
    const storedKey = remember
      ? window.localStorage.getItem(`${STORAGE_KEY}.key`) ?? ""
      : window.sessionStorage.getItem(SESSION_KEY) ?? "";
    return {
      provider,
      model: typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model
        : getDefaultModel(provider),
      apiKey: storedKey,
      remember,
    };
  } catch {
    return defaultLlmSettings();
  }
}

export function persistLlmSettings(settings: LlmSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: settings.provider,
        model: settings.model,
        remember: settings.remember,
      }),
    );
    if (settings.remember) {
      if (settings.apiKey) {
        window.localStorage.setItem(`${STORAGE_KEY}.key`, settings.apiKey);
      } else {
        window.localStorage.removeItem(`${STORAGE_KEY}.key`);
      }
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.localStorage.removeItem(`${STORAGE_KEY}.key`);
      if (settings.apiKey) {
        window.sessionStorage.setItem(SESSION_KEY, settings.apiKey);
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {
    // storage can be blocked; the in-memory state still works
  }
}

export function useLlmSettings() {
  const [settings, setSettingsState] = useState<LlmSettings>(defaultLlmSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettingsState(readLlmSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistLlmSettings(settings);
  }, [settings, hydrated]);

  const setSettings = useCallback((next: LlmSettings) => {
    setSettingsState(next);
  }, []);

  return { settings, setSettings, hydrated };
}

export function maskKey(key: string): string {
  if (!key) return "not set";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
