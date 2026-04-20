import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import type { Provider, ModelKey, ImagePart, FilePart, TokenUsage } from "./types";

export const MODEL_MAP = {
  google_flash: google("gemini-2.0-flash"),
  google_pro: google("gemini-2.5-pro"),
  google_flash_25: google("gemini-2.5-flash"),
  xai_grok3: xai("grok-3"),
  xai_grok3_mini: xai("grok-3-mini"),
  xai_grok3_mini_nr: xai("grok-3-mini"),
} as const;

export const DEFAULT_MODEL: Record<Provider, ModelKey> = {
  google: "google_pro",
  xai: "xai_grok3",
};

/**
 * Fallback model within the same provider (e.g. google_pro → google_flash_25).
 */
export const FALLBACK_MODEL: Partial<Record<ModelKey, ModelKey>> = {
  google_pro: "google_flash_25",
  xai_grok3: "xai_grok3_mini",
};

/**
 * Provider-specific options applied automatically per model key.
 * e.g. disables reasoning for grok-3-mini no-reasoning variant.
 */
const MODEL_PROVIDER_OPTIONS: Partial<
  Record<ModelKey, Record<string, Record<string, string>>>
> = {
  xai_grok3_mini_nr: { xai: { reasoningEffort: "none" } },
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
  usage?: TokenUsage;
};

export async function callLLM(params: CallLLMParams): Promise<CallLLMResult> {
  const modelKey = params.modelKey ?? DEFAULT_MODEL[params.provider];
  const model = MODEL_MAP[modelKey];
  const providerOptions = MODEL_PROVIDER_OPTIONS[modelKey];

  const hasImages = params.images && params.images.length > 0;
  const hasFiles = params.files && params.files.length > 0;

  const baseOpts = {
    model,
    system: params.system,
    temperature: params.temperature ?? 0,
    maxOutputTokens: params.maxTokens ?? 16384,
    ...(providerOptions ? { providerOptions } : {}),
  };

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

    const { text, usage } = await generateText({
      ...baseOpts,
      messages: [{ role: "user", content: contentParts }],
    });

    return {
      text,
      provider: params.provider,
      model: modelKey,
      usage: usage
        ? {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
          }
        : undefined,
    };
  }

  // Text-only: use simple prompt format
  const { text, usage } = await generateText({
    ...baseOpts,
    prompt: params.user,
  });

  return {
    text,
    provider: params.provider,
    model: modelKey,
    usage: usage
      ? {
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        }
      : undefined,
  };
}
