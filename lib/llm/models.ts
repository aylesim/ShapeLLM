export const LLM_PROVIDERS = ["openai", "openrouter", "deepseek"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export type ModelOption = {
  id: string;
  name: string;
  tier: "free" | "fast" | "balanced" | "strong";
  note?: string;
};

export const MODEL_OPTIONS: Record<LlmProvider, ModelOption[]> = {
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o mini", tier: "fast" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 mini", tier: "fast" },
    { id: "gpt-4o", name: "GPT-4o", tier: "balanced" },
    { id: "gpt-4.1", name: "GPT-4.1", tier: "strong" },
    { id: "o4-mini", name: "o4-mini", tier: "strong" },
  ],
  openrouter: [
    { id: "openrouter/free", name: "OpenRouter Free", tier: "free" },
    {
      id: "anthropic/claude-3.5-haiku",
      name: "Claude 3.5 Haiku",
      tier: "fast",
    },
    {
      id: "google/gemini-2.0-flash-001",
      name: "Gemini 2.0 Flash",
      tier: "fast",
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B",
      tier: "balanced",
    },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek Chat", tier: "balanced" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner", tier: "strong" },
  ],
};

export const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "openrouter/free",
  deepseek: "deepseek-chat",
};

export function getDefaultModel(provider: LlmProvider): string {
  return DEFAULT_MODEL[provider];
}

export function isLlmProvider(value: unknown): value is LlmProvider {
  return (
    value === "openai" || value === "openrouter" || value === "deepseek"
  );
}
