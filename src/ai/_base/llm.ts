import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import type { Provider, ModelKey } from "./types";

export const MODEL_MAP = {
  google_flash: google("gemini-2.0-flash"),
  google_pro: google("gemini-2.0-pro"),
  anthropic_haiku: anthropic("claude-3-5-haiku-latest"),
  anthropic_sonnet: anthropic("claude-3-5-sonnet-latest"),
} as const;

export const DEFAULT_MODEL: Record<Provider, ModelKey> = {
  google: "google_flash",
  anthropic: "anthropic_haiku",
};

export const FALLBACK_PROVIDER: Record<Provider, Provider> = {
  google: "anthropic",
  anthropic: "google",
};

type CallLLMParams = {
  provider: Provider;
  modelKey?: ModelKey;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

type CallLLMResult = {
  text: string;
  provider: Provider;
  model: string;
};

export async function callLLM(params: CallLLMParams): Promise<CallLLMResult> {
  const modelKey = params.modelKey ?? DEFAULT_MODEL[params.provider];
  const model = MODEL_MAP[modelKey];

  const { text } = await generateText({
    model,
    system: params.system,
    prompt: params.user,
    temperature: params.temperature ?? 0,
    maxOutputTokens: params.maxTokens ?? 4096,
  });

  return {
    text,
    provider: params.provider,
    model: modelKey,
  };
}
