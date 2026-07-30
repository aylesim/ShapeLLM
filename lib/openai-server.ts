import OpenAI from "openai";
import { LlmProvider, resolveLlmProvider } from "./llm-provider";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type CreateLlmClientOptions = {
  apiKey?: string | null;
  provider?: LlmProvider | null;
};

function normalizeOptions(
  options?: string | null | CreateLlmClientOptions,
): CreateLlmClientOptions {
  if (typeof options === "string" || options === null || options === undefined) {
    return { apiKey: options ?? undefined };
  }
  return options;
}

export function createOpenAiClient(
  options?: string | null | CreateLlmClientOptions,
): OpenAI {
  const { apiKey: apiKeyFromRequest, provider: providerFromRequest } =
    normalizeOptions(options);
  const provider = resolveLlmProvider(providerFromRequest);

  const key =
    (typeof apiKeyFromRequest === "string" && apiKeyFromRequest.trim()) ||
    (provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim());

  if (!key) {
    const envHint = provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY";
    throw new Error(
      `API key missing for ${provider}. Paste your key in the app, or set ${envHint} when running locally.`,
    );
  }

  const config: ConstructorParameters<typeof OpenAI>[0] = { apiKey: key };

  if (provider === "openrouter") {
    config.baseURL = OPENROUTER_BASE_URL;
    const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
    const title = process.env.OPENROUTER_APP_TITLE?.trim() || "ShapeLLM";
    config.defaultHeaders = {
      Authorization: `Bearer ${key}`,
      ...(referer ? { "HTTP-Referer": referer } : {}),
      "X-OpenRouter-Title": title,
    };
  }

  return new OpenAI(config);
}

export { resolveLlmModel, getDefaultLlmModel } from "./llm-models";
