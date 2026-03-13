import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export type Provider = "openai" | "anthropic" | "google";

const PROVIDER_ORDER: Provider[] = ["anthropic", "openai", "google"];

const ENV_KEYS: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/** Returns the first provider that has a non-empty API key set. */
export function getFirstAvailableProvider(): Provider | null {
  for (const p of PROVIDER_ORDER) {
    const key = process.env[ENV_KEYS[p]];
    if (key != null && String(key).trim() !== "") return p;
  }
  return null;
}

/** Use requested provider if its key is set; otherwise use first available. */
export function resolveProvider(requested?: Provider): Provider {
  if (requested) {
    const key = process.env[ENV_KEYS[requested]];
    if (key != null && String(key).trim() !== "") return requested;
  }
  const fallback = getFirstAvailableProvider();
  if (fallback) return fallback;
  throw new Error(
    "No AI API key found. Set one of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env"
  );
}

export function getModel(provider: Provider) {
  switch (provider) {
    case "openai":
      return openai("gpt-4o");
    case "anthropic":
      return anthropic("claude-sonnet-4-20250514");
    case "google":
      return google("gemini-2.0-flash");
    default:
      throw new Error(`Unsupported provider: ${provider satisfies never}`);
  }
}
