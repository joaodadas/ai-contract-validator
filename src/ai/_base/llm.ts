import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import type { Provider, ModelKey, ImagePart, FilePart } from "./types";

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
  images?: ImagePart[];
  files?: FilePart[];
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

  const hasImages = params.images && params.images.length > 0;
  const hasFiles = params.files && params.files.length > 0;

  if (hasImages || hasFiles) {
    // Multimodal: use messages format with content parts
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: Buffer; mimeType?: string }
      | { type: "file"; data: Buffer; mediaType: string }
    > = [{ type: "text", text: params.user }];

    if (params.images) {
      for (const img of params.images) {
        contentParts.push({
          type: "image",
          image: img.data,
          mimeType: img.mimeType,
        });
      }
    }

    if (params.files) {
      for (const file of params.files) {
        contentParts.push({
          type: "file",
          data: file.data,
          mediaType: file.mimeType,
        });
      }
    }

    const { text } = await generateText({
      model,
      system: params.system,
      messages: [{ role: "user", content: contentParts }],
      temperature: params.temperature ?? 0,
      maxOutputTokens: params.maxTokens ?? 4096,
    });

    return { text, provider: params.provider, model: modelKey };
  }

  // Text-only: use simple prompt format
  const { text } = await generateText({
    model,
    system: params.system,
    prompt: params.user,
    temperature: params.temperature ?? 0,
    maxOutputTokens: params.maxTokens ?? 4096,
  });

  return { text, provider: params.provider, model: modelKey };
}
