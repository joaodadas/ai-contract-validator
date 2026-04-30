import type { ZodSchema } from "zod";
import type {
  AgentName,
  AgentInput,
  AgentRunOptions,
  AgentResult,
  Provider,
  TokenUsage,
} from "./types";
import { callLLM, DEFAULT_MODEL, FALLBACK_MODEL } from "./llm";
import { safeJsonParse } from "./zod";

function addUsage(total: TokenUsage, add: TokenUsage | undefined): void {
  if (!add) return;
  total.promptTokens += add.promptTokens;
  total.completionTokens += add.completionTokens;
  total.totalTokens += add.totalTokens;
}

const JSON_FIX_INSTRUCTION =
  "Your previous response was invalid JSON. Return ONLY valid JSON matching the schema. No extra text, no markdown.";

const SCHEMA_FIX_INSTRUCTION =
  "Your previous response did not match the schema. Fix the JSON to match EXACTLY the schema keys and types. Return ONLY the corrected JSON.";

type RunAgentArgs<T> = {
  agent: AgentName;
  systemPrompt: string;
  promptVersion?: string;
  userInput: AgentInput;
  schema: ZodSchema<T>;
  options?: AgentRunOptions;
};

export async function runAgent<T>(args: RunAgentArgs<T>): Promise<AgentResult<T>> {
  const { agent, systemPrompt, userInput, schema, options } = args;
  
  // Infer primary provider from modelKey if not explicitly provided
  const modelKey = options?.modelKey ?? "google_flash_lite_31";
  const primaryProvider: Provider = options?.provider ?? (modelKey.startsWith("xai_") ? "xai" : "google");
  
  let attempts = 0;
  let lastRaw: string | undefined;
  let lastError: string | undefined;
  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // --- Primary provider: up to 2 attempts ---
  for (let i = 0; i < 2; i++) {
    attempts++;
    const userMessage =
      i === 0
        ? userInput.text
        : `${userInput.text}\n\n${lastError?.includes("schema") ? SCHEMA_FIX_INSTRUCTION : JSON_FIX_INSTRUCTION}`;

    try {
      const llmResult = await callLLM({
        provider: primaryProvider,
        modelKey: options?.modelKey,
        system: systemPrompt,
        user: userMessage,
        images: userInput.images,
        files: userInput.files,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      lastRaw = llmResult.text;
      addUsage(totalUsage, llmResult.usage);

      const parsed = safeJsonParse(llmResult.text);
      if (!parsed.ok) {
        lastError = `json_parse: ${parsed.error}`;
        continue;
      }

      const validated = schema.safeParse(parsed.value);
      if (!validated.success) {
        lastError = `schema: ${validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
        continue;
      }

      return {
        agent,
        ok: true,
        data: validated.data,
        raw: lastRaw,
        provider: llmResult.provider,
        model: llmResult.model,
        attempts,
        usage: totalUsage,
        promptVersion: args.promptVersion,
      };
    } catch (err) {
      lastError = `llm_error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // --- Fallback model (cross-provider): 1 attempt ---
  const primaryModelKey = options?.modelKey ?? DEFAULT_MODEL[primaryProvider];
  const fallbackModelKey = FALLBACK_MODEL[primaryModelKey];
  const fallbackProvider: Provider = fallbackModelKey?.startsWith("xai_") ? "xai" : "google";
  if (fallbackModelKey) {
    attempts++;
    try {
      const fallbackModelResult = await callLLM({
        provider: fallbackProvider,
        modelKey: fallbackModelKey,
        system: systemPrompt,
        user: userInput.text,
        images: userInput.images,
        files: userInput.files,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      lastRaw = fallbackModelResult.text;
      addUsage(totalUsage, fallbackModelResult.usage);
      const parsed = safeJsonParse(fallbackModelResult.text);
      if (parsed.ok) {
        const validated = schema.safeParse(parsed.value);
        if (validated.success) {
          return {
            agent,
            ok: true,
            data: validated.data,
            raw: lastRaw,
            provider: fallbackModelResult.provider,
            model: fallbackModelResult.model,
            attempts,
            usage: totalUsage,
            promptVersion: args.promptVersion,
          };
        }
        lastError = `fallback_model_schema: ${validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
      } else {
        lastError = `fallback_model_json: ${parsed.error}`;
      }
    } catch (err) {
      lastError = `fallback_model_error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    agent,
    ok: false,
    error: lastError,
    raw: lastRaw,
    provider: primaryProvider,
    attempts,
    usage: totalUsage,
    promptVersion: args.promptVersion,
  };
}
