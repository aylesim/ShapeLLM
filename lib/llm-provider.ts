export const LLM_PROVIDERS = ["openai", "openrouter"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export function parseLlmProvider(value: unknown): LlmProvider | undefined {
  if (value === "openai" || value === "openrouter") return value;
  return undefined;
}

export function resolveLlmProvider(fromRequest?: LlmProvider | null): LlmProvider {
  return fromRequest ?? parseLlmProvider(process.env.LLM_PROVIDER) ?? "openai";
}
