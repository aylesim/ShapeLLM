import type { LlmProvider } from "./llm-provider";

export type LlmModelOption = {
  id: string;
  name: string;
};

export const OPENAI_MODEL_OPTIONS: LlmModelOption[] = [
  { id: "gpt-4o-mini", name: "GPT-4o mini" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini" },
  { id: "gpt-4.1", name: "GPT-4.1" },
  { id: "o4-mini", name: "o4-mini" },
];

export const DEFAULT_LLM_MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "openrouter/free",
};

export function getDefaultLlmModel(provider: LlmProvider): string {
  if (provider === "openrouter") {
    return (
      process.env.OPENROUTER_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      DEFAULT_LLM_MODEL_BY_PROVIDER.openrouter
    );
  }
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_LLM_MODEL_BY_PROVIDER.openai;
}

export function resolveLlmModel(provider: LlmProvider, modelFromRequest?: string | null): string {
  const trimmed = modelFromRequest?.trim();
  if (trimmed) return trimmed;
  return getDefaultLlmModel(provider);
}
