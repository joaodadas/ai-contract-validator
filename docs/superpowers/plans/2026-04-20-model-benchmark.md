# Model Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a benchmark system that runs the contract validation pipeline with 6 AI models (3 Gemini, 3 Grok), capturing token usage, cost, and quality metrics.

**Architecture:** Extend core AI infrastructure (`types.ts`, `llm.ts`, `runAgent.ts`) to support xAI as a provider and capture token usage. Create a pricing module, a field comparator for quality measurement, and two scripts: one to export real reservation data as fixtures, another to run the benchmark and print results.

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/xai`), TypeScript, Jest, Drizzle ORM (for fixture export)

**Spec:** `docs/superpowers/specs/2026-04-20-model-benchmark-design.md`

---

### Task 1: Foundation — Types, env, dependencies

**Files:**
- Modify: `src/ai/_base/types.ts`
- Modify: `.env.local.example`
- Modify: `.gitignore`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install @ai-sdk/xai**

Run: `npm install @ai-sdk/xai`

- [ ] **Step 2: Expand types in `src/ai/_base/types.ts`**

Add `"xai"` to `Provider`, new xAI model keys to `ModelKey`, and `TokenUsage` type:

```typescript
export type Provider = "google" | "xai";

export type ModelKey =
  | "google_flash"
  | "google_pro"
  | "google_flash_25"
  | "xai_grok3"
  | "xai_grok3_mini"
  | "xai_grok3_mini_nr";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
```

Add `usage?: TokenUsage` to `AgentResult`:

```typescript
export type AgentResult<T> = {
  agent: AgentName;
  ok: boolean;
  data?: T;
  error?: string;
  raw?: string;
  provider?: Provider;
  model?: string;
  attempts: number;
  pessoa?: string;
  usage?: TokenUsage;
};
```

- [ ] **Step 3: Add XAI_API_KEY to `.env.local.example`**

Add after the `ANTHROPIC_API_KEY` line:

```
XAI_API_KEY=your-xai-api-key
```

- [ ] **Step 4: Add `backtest/` to `.gitignore`**

Add at the end of `.gitignore`:

```
# benchmark fixtures and results (contains real documents)
/backtest
```

- [ ] **Step 5: Run tests to verify nothing broke**

Run: `npm test`
Expected: All existing tests pass (type expansions are additive — no breaking changes).

- [ ] **Step 6: Commit**

```bash
git add src/ai/_base/types.ts .env.local.example .gitignore package.json package-lock.json
git commit -m "feat: add xAI provider types, TokenUsage, and env setup"
```

---

### Task 2: Pricing module (TDD)

**Files:**
- Create: `src/ai/benchmark/pricing.ts`
- Create: `src/__tests__/ai/benchmark/pricing.test.ts`

- [ ] **Step 1: Write failing tests for pricing**

Create `src/__tests__/ai/benchmark/pricing.test.ts`:

```typescript
import { calculateCost, MODEL_PRICING } from "@/ai/benchmark/pricing";

describe("MODEL_PRICING", () => {
  it("has pricing for all 6 model keys", () => {
    const keys = Object.keys(MODEL_PRICING);
    expect(keys).toHaveLength(6);
    expect(keys).toContain("google_pro");
    expect(keys).toContain("google_flash_25");
    expect(keys).toContain("google_flash");
    expect(keys).toContain("xai_grok3");
    expect(keys).toContain("xai_grok3_mini");
    expect(keys).toContain("xai_grok3_mini_nr");
  });
});

describe("calculateCost", () => {
  it("calculates flat pricing correctly (google_flash)", () => {
    // 100k input × $0.10/1M + 10k output × $0.40/1M
    const cost = calculateCost("google_flash", 100_000, 10_000);
    expect(cost).toBeCloseTo(0.014, 4);
  });

  it("calculates Gemini 2.5 Pro under threshold (≤200k input)", () => {
    // 100k input × $1.25/1M + 10k output × $10.00/1M
    const cost = calculateCost("google_pro", 100_000, 10_000);
    expect(cost).toBeCloseTo(0.225, 4);
  });

  it("calculates Gemini 2.5 Pro above threshold (>200k input)", () => {
    // 250k input × $2.50/1M + 10k output × $15.00/1M
    const cost = calculateCost("google_pro", 250_000, 10_000);
    expect(cost).toBeCloseTo(0.775, 4);
  });

  it("calculates xai_grok3 correctly", () => {
    // 100k input × $3.00/1M + 10k output × $15.00/1M
    const cost = calculateCost("xai_grok3", 100_000, 10_000);
    expect(cost).toBeCloseTo(0.45, 4);
  });

  it("calculates xai_grok3_mini correctly", () => {
    // 100k input × $0.30/1M + 10k output × $0.50/1M
    const cost = calculateCost("xai_grok3_mini", 100_000, 10_000);
    expect(cost).toBeCloseTo(0.035, 4);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost("google_flash", 0, 0)).toBe(0);
  });

  it("grok3_mini_nr has same pricing as grok3_mini", () => {
    const costMini = calculateCost("xai_grok3_mini", 50_000, 5_000);
    const costNr = calculateCost("xai_grok3_mini_nr", 50_000, 5_000);
    expect(costMini).toBe(costNr);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ai/benchmark/pricing.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pricing module**

Create `src/ai/benchmark/pricing.ts`:

```typescript
import type { ModelKey } from "@/ai/_base/types";

type PricingTier = {
  inputPer1M: number;
  outputPer1M: number;
  inputPer1MAboveThreshold?: number;
  outputPer1MAboveThreshold?: number;
  thresholdTokens?: number;
};

export const MODEL_PRICING: Record<ModelKey, PricingTier> = {
  google_pro: {
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    inputPer1MAboveThreshold: 2.5,
    outputPer1MAboveThreshold: 15.0,
    thresholdTokens: 200_000,
  },
  google_flash_25: { inputPer1M: 0.3, outputPer1M: 2.5 },
  google_flash: { inputPer1M: 0.1, outputPer1M: 0.4 },
  xai_grok3: { inputPer1M: 3.0, outputPer1M: 15.0 },
  xai_grok3_mini: { inputPer1M: 0.3, outputPer1M: 0.5 },
  xai_grok3_mini_nr: { inputPer1M: 0.3, outputPer1M: 0.5 },
};

export function calculateCost(
  modelKey: ModelKey,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = MODEL_PRICING[modelKey];
  const aboveThreshold = p.thresholdTokens && promptTokens > p.thresholdTokens;
  const inputRate = aboveThreshold ? p.inputPer1MAboveThreshold! : p.inputPer1M;
  const outputRate = aboveThreshold
    ? p.outputPer1MAboveThreshold!
    : p.outputPer1M;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/benchmark/pricing.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/benchmark/pricing.ts src/__tests__/ai/benchmark/pricing.test.ts
git commit -m "feat: add model pricing module with tiered cost calculation"
```

---

### Task 3: LLM module — xAI models + token usage capture (TDD)

**Files:**
- Modify: `src/ai/_base/llm.ts`
- Create: `src/__tests__/ai/_base/llm.test.ts`

- [ ] **Step 1: Write failing tests for callLLM usage capture and providerOptions**

Create `src/__tests__/ai/_base/llm.test.ts`:

```typescript
import type { ModelKey } from "@/ai/_base/types";

// Mock ai package
const mockGenerateText = jest.fn();
jest.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock @ai-sdk/google
jest.mock("@ai-sdk/google", () => ({
  google: (modelId: string) => ({ provider: "google", modelId }),
}));

// Mock @ai-sdk/xai
jest.mock("@ai-sdk/xai", () => ({
  xai: (modelId: string) => ({ provider: "xai", modelId }),
}));

import { callLLM, MODEL_MAP, DEFAULT_MODEL, FALLBACK_MODEL } from "@/ai/_base/llm";

describe("MODEL_MAP", () => {
  it("contains all 6 model keys", () => {
    expect(Object.keys(MODEL_MAP)).toHaveLength(6);
    expect(MODEL_MAP).toHaveProperty("xai_grok3");
    expect(MODEL_MAP).toHaveProperty("xai_grok3_mini");
    expect(MODEL_MAP).toHaveProperty("xai_grok3_mini_nr");
  });
});

describe("DEFAULT_MODEL", () => {
  it("has defaults for both providers", () => {
    expect(DEFAULT_MODEL.google).toBe("google_pro");
    expect(DEFAULT_MODEL.xai).toBe("xai_grok3");
  });
});

describe("FALLBACK_MODEL", () => {
  it("maps xai_grok3 to xai_grok3_mini", () => {
    expect(FALLBACK_MODEL.xai_grok3).toBe("xai_grok3_mini");
  });
});

describe("callLLM", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("returns usage from generateText response", async () => {
    mockGenerateText.mockResolvedValue({
      text: "response",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    const result = await callLLM({
      provider: "google",
      modelKey: "google_flash",
      system: "system prompt",
      user: "user prompt",
    });

    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("returns undefined usage when generateText has no usage", async () => {
    mockGenerateText.mockResolvedValue({ text: "response" });

    const result = await callLLM({
      provider: "google",
      modelKey: "google_flash",
      system: "sys",
      user: "usr",
    });

    expect(result.usage).toBeUndefined();
  });

  it("passes providerOptions for xai_grok3_mini_nr", async () => {
    mockGenerateText.mockResolvedValue({
      text: "response",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    await callLLM({
      provider: "xai",
      modelKey: "xai_grok3_mini_nr",
      system: "sys",
      user: "usr",
    });

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.providerOptions).toEqual({
      xai: { reasoningEffort: "none" },
    });
  });

  it("does not pass providerOptions for models without overrides", async () => {
    mockGenerateText.mockResolvedValue({
      text: "response",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    await callLLM({
      provider: "google",
      modelKey: "google_flash",
      system: "sys",
      user: "usr",
    });

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.providerOptions).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ai/_base/llm.test.ts`
Expected: FAIL — MODEL_MAP missing xai keys, callLLM doesn't return usage

- [ ] **Step 3: Update `src/ai/_base/llm.ts`**

Replace the entire file:

```typescript
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

export const FALLBACK_MODEL: Partial<Record<ModelKey, ModelKey>> = {
  google_pro: "google_flash_25",
  xai_grok3: "xai_grok3_mini",
};

/**
 * Provider-specific options applied automatically per model key.
 * e.g. disables reasoning for grok-3-mini no-reasoning variant.
 */
const MODEL_PROVIDER_OPTIONS: Partial<
  Record<ModelKey, Record<string, Record<string, unknown>>>
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
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : undefined,
    };
  }

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
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        }
      : undefined,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/_base/llm.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/_base/llm.ts src/__tests__/ai/_base/llm.test.ts
git commit -m "feat: add xAI models to LLM module, capture token usage"
```

---

### Task 4: runAgent — accumulate usage across retries (TDD)

**Files:**
- Modify: `src/ai/_base/runAgent.ts`
- Create: `src/__tests__/ai/_base/runAgent.test.ts`

- [ ] **Step 1: Write failing tests for usage accumulation**

Create `src/__tests__/ai/_base/runAgent.test.ts`:

```typescript
import type { TokenUsage } from "@/ai/_base/types";

const mockCallLLM = jest.fn();
jest.mock("@/ai/_base/llm", () => ({
  callLLM: (...args: unknown[]) => mockCallLLM(...args),
  DEFAULT_MODEL: { google: "google_pro", xai: "xai_grok3" },
  FALLBACK_MODEL: { google_pro: "google_flash_25" },
}));

import { runAgent } from "@/ai/_base/runAgent";
import { z } from "zod";

const simpleSchema = z.object({ name: z.string() });

describe("runAgent usage tracking", () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
  });

  it("returns usage from a successful first attempt", async () => {
    mockCallLLM.mockResolvedValue({
      text: '{"name":"test"}',
      provider: "google",
      model: "google_pro",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "extract",
      userInput: { text: "doc content" },
      schema: simpleSchema,
    });

    expect(result.ok).toBe(true);
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("accumulates usage across retry attempts", async () => {
    // First attempt: valid JSON but fails schema
    mockCallLLM
      .mockResolvedValueOnce({
        text: '{"wrong":"field"}',
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130 },
      })
      // Second attempt: succeeds
      .mockResolvedValueOnce({
        text: '{"name":"test"}',
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 120, completionTokens: 40, totalTokens: 160 },
      });

    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "extract",
      userInput: { text: "doc content" },
      schema: simpleSchema,
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.usage).toEqual({
      promptTokens: 220,
      completionTokens: 70,
      totalTokens: 290,
    });
  });

  it("accumulates usage including fallback attempt", async () => {
    // Two primary failures + fallback success
    mockCallLLM
      .mockResolvedValueOnce({
        text: "not json",
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 80, completionTokens: 20, totalTokens: 100 },
      })
      .mockResolvedValueOnce({
        text: "still not json",
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 90, completionTokens: 25, totalTokens: 115 },
      })
      .mockResolvedValueOnce({
        text: '{"name":"fallback"}',
        provider: "google",
        model: "google_flash_25",
        usage: { promptTokens: 70, completionTokens: 15, totalTokens: 85 },
      });

    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "extract",
      userInput: { text: "doc content" },
      schema: simpleSchema,
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.usage).toEqual({
      promptTokens: 240,
      completionTokens: 60,
      totalTokens: 300,
    });
  });

  it("returns accumulated usage even on total failure", async () => {
    mockCallLLM
      .mockResolvedValueOnce({
        text: "bad",
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
      })
      .mockResolvedValueOnce({
        text: "bad",
        provider: "google",
        model: "google_pro",
        usage: { promptTokens: 60, completionTokens: 15, totalTokens: 75 },
      })
      .mockResolvedValueOnce({
        text: "bad",
        provider: "google",
        model: "google_flash_25",
        usage: { promptTokens: 40, completionTokens: 8, totalTokens: 48 },
      });

    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "extract",
      userInput: { text: "doc content" },
      schema: simpleSchema,
    });

    expect(result.ok).toBe(false);
    expect(result.usage).toEqual({
      promptTokens: 150,
      completionTokens: 33,
      totalTokens: 183,
    });
  });

  it("handles missing usage gracefully (no crash)", async () => {
    mockCallLLM.mockResolvedValue({
      text: '{"name":"test"}',
      provider: "google",
      model: "google_pro",
      // no usage field
    });

    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "extract",
      userInput: { text: "doc content" },
      schema: simpleSchema,
    });

    expect(result.ok).toBe(true);
    expect(result.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ai/_base/runAgent.test.ts`
Expected: FAIL — `result.usage` is undefined

- [ ] **Step 3: Update `src/ai/_base/runAgent.ts` to accumulate usage**

Replace the file with:

```typescript
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

const JSON_FIX_INSTRUCTION =
  "Your previous response was invalid JSON. Return ONLY valid JSON matching the schema. No extra text, no markdown.";

const SCHEMA_FIX_INSTRUCTION =
  "Your previous response did not match the schema. Fix the JSON to match EXACTLY the schema keys and types. Return ONLY the corrected JSON.";

type RunAgentArgs<T> = {
  agent: AgentName;
  systemPrompt: string;
  userInput: AgentInput;
  schema: ZodSchema<T>;
  options?: AgentRunOptions;
};

function addUsage(total: TokenUsage, add?: TokenUsage): void {
  if (!add) return;
  total.promptTokens += add.promptTokens;
  total.completionTokens += add.completionTokens;
  total.totalTokens += add.totalTokens;
}

export async function runAgent<T>(args: RunAgentArgs<T>): Promise<AgentResult<T>> {
  const { agent, systemPrompt, userInput, schema, options } = args;
  const primaryProvider: Provider = options?.provider ?? "google";
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

      addUsage(totalUsage, llmResult.usage);
      lastRaw = llmResult.text;

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
      };
    } catch (err) {
      lastError = `llm_error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // --- Fallback model (same provider): 1 attempt ---
  const primaryModelKey = options?.modelKey ?? DEFAULT_MODEL[primaryProvider];
  const fallbackModelKey = FALLBACK_MODEL[primaryModelKey];
  if (fallbackModelKey) {
    attempts++;
    try {
      const fallbackModelResult = await callLLM({
        provider: primaryProvider,
        modelKey: fallbackModelKey,
        system: systemPrompt,
        user: userInput.text,
        images: userInput.images,
        files: userInput.files,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      addUsage(totalUsage, fallbackModelResult.usage);
      lastRaw = fallbackModelResult.text;

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
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/_base/runAgent.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Run all tests to ensure nothing broke**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/ai/_base/runAgent.ts src/__tests__/ai/_base/runAgent.test.ts
git commit -m "feat: accumulate token usage across all retry attempts in runAgent"
```

---

### Task 5: Fix existing tests for expanded types

**Files:**
- Modify: `src/__tests__/ai/orchestrator/agentModelConfig.test.ts`

The `AGENT_MODEL_DEFAULTS` type now requires entries for any `AgentName`, and `ModelKey` was expanded. The existing tests check exact counts, which still hold. But the test that checks `resolveAgentOptions` with explicit `modelKey: "google_pro"` — that still works because `"google_pro"` is a valid `ModelKey`.

- [ ] **Step 1: Run all existing tests**

Run: `npm test`
Expected: Check if any tests fail due to type changes. If all pass, skip this task (commit nothing). If tests fail, proceed to fix them.

- [ ] **Step 2: Fix any failing tests**

Likely fixes:
- If `agentModelConfig.test.ts` fails because `resolveAgentOptions` now needs to handle xAI model keys in the `isFlash` check, update the check. The current code at `agentModelConfig.ts:46` only checks `google_flash_25` and `google_flash` — xAI keys won't trigger the upgrade logic, which is correct behavior.
- If any mock of `callLLM` fails because the return type now includes `usage`, add `usage: undefined` to mocks.

- [ ] **Step 3: Commit if changes were made**

```bash
git add -A
git commit -m "test: fix existing tests for expanded Provider/ModelKey types"
```

---

### Task 6: Field comparator module (TDD)

**Files:**
- Create: `src/ai/benchmark/comparator.ts`
- Create: `src/__tests__/ai/benchmark/comparator.test.ts`

- [ ] **Step 1: Write failing tests for field comparison**

Create `src/__tests__/ai/benchmark/comparator.test.ts`:

```typescript
import { compareFields, type FieldComparison } from "@/ai/benchmark/comparator";

describe("compareFields", () => {
  it("marks matching strings as match", () => {
    const result = compareFields(
      { nome: "João Silva" },
      { nome: "João Silva" },
    );
    expect(result).toEqual([
      { field: "nome", status: "match", expected: "João Silva", actual: "João Silva" },
    ]);
  });

  it("normalizes strings before comparing (trim, lowercase, accents)", () => {
    const result = compareFields(
      { nome: "  JOÃO SILVA  " },
      { nome: "joao silva" },
    );
    expect(result[0].status).toBe("match");
  });

  it("marks different strings as mismatch", () => {
    const result = compareFields(
      { nome: "João Silva" },
      { nome: "Maria Santos" },
    );
    expect(result[0].status).toBe("mismatch");
  });

  it("marks missing fields in actual as missing", () => {
    const result = compareFields(
      { nome: "João", cpf: "123" },
      { nome: "João" },
    );
    const cpfResult = result.find((r) => r.field === "cpf");
    expect(cpfResult?.status).toBe("missing");
  });

  it("compares numbers with R$ 1.00 tolerance", () => {
    const matchResult = compareFields(
      { valor: 1000.50 },
      { valor: 1001.00 },
    );
    expect(matchResult[0].status).toBe("match");

    const mismatchResult = compareFields(
      { valor: 1000.00 },
      { valor: 1002.00 },
    );
    expect(mismatchResult[0].status).toBe("mismatch");
  });

  it("handles null and undefined as equal", () => {
    const result = compareFields(
      { campo: null },
      { campo: undefined },
    );
    expect(result[0].status).toBe("match");
  });

  it("deep compares nested objects", () => {
    const result = compareFields(
      { output: { financeiro: { valor: 100 } } },
      { output: { financeiro: { valor: 100 } } },
    );
    expect(result[0].status).toBe("match");
  });

  it("deep compares arrays", () => {
    const matchResult = compareFields(
      { items: [1, 2, 3] },
      { items: [1, 2, 3] },
    );
    expect(matchResult[0].status).toBe("match");

    const mismatchResult = compareFields(
      { items: [1, 2, 3] },
      { items: [1, 2, 4] },
    );
    expect(mismatchResult[0].status).toBe("mismatch");
  });

  it("calculates match percentage", () => {
    const result = compareFields(
      { a: "same", b: "same", c: "diff" },
      { a: "same", b: "same", c: "other" },
    );
    const matches = result.filter((r) => r.status === "match").length;
    expect(matches / result.length).toBeCloseTo(0.6667, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ai/benchmark/comparator.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement comparator module**

Create `src/ai/benchmark/comparator.ts`:

```typescript
export type FieldComparison = {
  field: string;
  status: "match" | "mismatch" | "missing";
  expected: unknown;
  actual: unknown;
};

const NUMERIC_TOLERANCE = 1.0; // R$ 1.00

function normalizeString(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isNullish(a) && isNullish(b)) return true;

  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= NUMERIC_TOLERANCE;
  }

  if (typeof a === "string" && typeof b === "string") {
    return normalizeString(a) === normalizeString(b);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null
  ) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }

  return false;
}

export function compareFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): FieldComparison[] {
  const results: FieldComparison[] = [];

  for (const field of Object.keys(expected)) {
    const expectedVal = expected[field];
    const actualVal = actual[field];

    if (!(field in actual) && !isNullish(expectedVal)) {
      results.push({ field, status: "missing", expected: expectedVal, actual: undefined });
      continue;
    }

    const isMatch = deepEqual(expectedVal, actualVal);
    results.push({
      field,
      status: isMatch ? "match" : "mismatch",
      expected: expectedVal,
      actual: actualVal,
    });
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/benchmark/comparator.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/benchmark/comparator.ts src/__tests__/ai/benchmark/comparator.test.ts
git commit -m "feat: add field comparator for benchmark quality measurement"
```

---

### Task 7: Export backtest fixtures script

**Files:**
- Create: `scripts/export-backtest.ts`

This script queries the database for complete reservations, downloads their documents, and saves everything as local fixtures.

- [ ] **Step 1: Create the export script**

Create `scripts/export-backtest.ts`:

```typescript
import "dotenv/config";
import { db } from "@/db";
import { reservationsTable, reservationAuditsTable } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { downloadDocuments } from "@/lib/cvcrm/documentDownloader";
import type { ReservaProcessada } from "@/lib/cvcrm/types";
import * as fs from "node:fs";
import * as path from "node:path";

const BACKTEST_DIR = path.resolve(process.cwd(), "backtest/fixtures");

async function main() {
  const targetIds = process.argv.slice(2);

  console.log("🔍 Querying reservations...");

  let reservations;
  if (targetIds.length > 0) {
    // Export specific reservations by externalId
    reservations = await db
      .select()
      .from(reservationsTable)
      .where(inArray(reservationsTable.externalId, targetIds));
  } else {
    // Export all approved/confirmed with snapshots
    reservations = await db
      .select()
      .from(reservationsTable)
      .where(
        inArray(reservationsTable.status, ["approved", "confirmed"]),
      )
      .orderBy(desc(reservationsTable.createdAt))
      .limit(10);
  }

  console.log(`📋 Found ${reservations.length} reservations`);

  const manifest: Array<{
    externalId: string;
    enterprise: string;
    status: string;
    documentCount: number;
  }> = [];

  for (const res of reservations) {
    const extId = res.externalId;
    const fixtureDir = path.join(BACKTEST_DIR, extId);
    const docsDir = path.join(fixtureDir, "documents");

    console.log(`\n📦 Exporting ${extId} (${res.enterprise})...`);

    // Create directories
    fs.mkdirSync(docsDir, { recursive: true });

    // Save reservation snapshot
    fs.writeFileSync(
      path.join(fixtureDir, "reservation.json"),
      JSON.stringify(res.cvcrmSnapshot, null, 2),
    );

    // Get latest audit as ground truth
    const audit = await db.query.reservationAuditsTable.findFirst({
      where: eq(reservationAuditsTable.reservationId, res.id),
      orderBy: desc(reservationAuditsTable.createdAt),
    });

    if (audit?.resultJson) {
      fs.writeFileSync(
        path.join(fixtureDir, "ground-truth.json"),
        JSON.stringify(audit.resultJson, null, 2),
      );
    }

    // Download documents from CVCRM snapshot
    const snapshot = res.cvcrmSnapshot as ReservaProcessada | null;
    if (snapshot?.documentos) {
      let docIndex = 0;
      for (const doc of snapshot.documentos) {
        if (!doc.link) continue;
        try {
          const response = await fetch(doc.link, {
            signal: AbortSignal.timeout(30_000),
          });
          if (!response.ok) {
            console.log(`  ⚠️ Failed to download: ${doc.nome} (${response.status})`);
            continue;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const ext = doc.link.split(".").pop()?.split("?")[0] ?? "bin";
          const safeName = doc.nome
            .replace(/[^a-zA-Z0-9-_]/g, "_")
            .substring(0, 50);
          const filename = `${docIndex.toString().padStart(2, "0")}-${safeName}.${ext}`;
          fs.writeFileSync(path.join(docsDir, filename), buffer);
          docIndex++;
        } catch (err) {
          console.log(`  ⚠️ Error downloading ${doc.nome}: ${err instanceof Error ? err.message : err}`);
        }
      }
      console.log(`  ✅ ${docIndex} documents saved`);

      manifest.push({
        externalId: extId,
        enterprise: res.enterprise,
        status: res.status,
        documentCount: docIndex,
      });
    }
  }

  // Write manifest
  fs.writeFileSync(
    path.join(BACKTEST_DIR, "manifest.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), fixtures: manifest }, null, 2),
  );

  console.log(`\n✅ Exported ${manifest.length} fixtures to ${BACKTEST_DIR}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Test the script compiles**

Run: `npx tsx --no-warnings scripts/export-backtest.ts --help 2>&1 || echo "Script loaded"`

This should at least parse without syntax errors. Don't run it against the real DB yet.

- [ ] **Step 3: Commit**

```bash
git add scripts/export-backtest.ts
git commit -m "feat: add export-backtest script for fixture generation"
```

---

### Task 8: Benchmark runner script

**Files:**
- Create: `scripts/run-benchmark.ts`

This is the main script that runs the pipeline with each model and prints results.

- [ ] **Step 1: Create the benchmark runner**

Create `scripts/run-benchmark.ts`:

```typescript
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ModelKey,
  AgentResult,
  TokenUsage,
} from "@/ai/_base/types";
import { MODEL_MAP } from "@/ai/_base/llm";
import { calculateCost, MODEL_PRICING } from "@/ai/benchmark/pricing";
import { compareFields, type FieldComparison } from "@/ai/benchmark/comparator";
import { runExtraction, runCrossValidation, runFinancialComparison, runPlantaValidation } from "@/ai/orchestrator/contractOrchestrator";
import { mapDocumentsToAgents, buildAgentInput } from "@/ai/orchestrator/agentDocumentMapper";
import { downloadDocuments } from "@/lib/cvcrm/documentDownloader";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import type { ReservaProcessada } from "@/lib/cvcrm/types";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const FIXTURES_DIR = getArg("fixtures", "backtest/fixtures");
const MODEL_FILTER = getArg("models", "all");
const CONCURRENCY = parseInt(getArg("concurrency", "1"), 10);

const ALL_MODELS: ModelKey[] = [
  "google_pro",
  "google_flash_25",
  "google_flash",
  "xai_grok3",
  "xai_grok3_mini",
  "xai_grok3_mini_nr",
];

const modelsToTest: ModelKey[] =
  MODEL_FILTER === "all"
    ? ALL_MODELS
    : (MODEL_FILTER.split(",") as ModelKey[]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentBenchResult = {
  agent: string;
  ok: boolean;
  error?: string;
  usage: TokenUsage;
  timeMs: number;
  data?: unknown;
};

type ModelBenchResult = {
  model: ModelKey;
  fixture: string;
  agents: AgentBenchResult[];
  totalUsage: TokenUsage;
  totalCost: number;
  totalTimeMs: number;
  successRate: number;
};

type FixtureData = {
  externalId: string;
  reservation: ReservaProcessada;
  groundTruth: Record<string, unknown> | null;
  documentContents: DocumentContent[];
};

// ---------------------------------------------------------------------------
// Load fixtures
// ---------------------------------------------------------------------------

function loadFixtures(): FixtureData[] {
  const manifestPath = path.join(FIXTURES_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ No manifest.json found in ${FIXTURES_DIR}`);
    console.error("Run: npx tsx scripts/export-backtest.ts");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const fixtures: FixtureData[] = [];

  for (const entry of manifest.fixtures) {
    const dir = path.join(FIXTURES_DIR, entry.externalId);
    const resPath = path.join(dir, "reservation.json");
    const gtPath = path.join(dir, "ground-truth.json");

    if (!fs.existsSync(resPath)) {
      console.warn(`⚠️ Skipping ${entry.externalId}: no reservation.json`);
      continue;
    }

    const reservation = JSON.parse(fs.readFileSync(resPath, "utf-8"));
    const groundTruth = fs.existsSync(gtPath)
      ? JSON.parse(fs.readFileSync(gtPath, "utf-8"))
      : null;

    // Load document files from disk as DocumentContent[]
    const docsDir = path.join(dir, "documents");
    const documentContents: DocumentContent[] = [];

    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      for (const file of files) {
        const filePath = path.join(docsDir, file);
        const data = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const isPdf = ext === ".pdf";
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);

        // Map back to DocumentContent format from the reservation snapshot
        const docMeta = reservation.documentos?.find(
          (d: { nome: string }) =>
            file.includes(d.nome?.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50)),
        );

        documentContents.push({
          documentId: docMeta?.id ?? 0,
          nome: docMeta?.nome ?? file,
          tipo: docMeta?.tipo ?? "unknown",
          contentType: isPdf ? "text" : "image",
          text: isPdf ? undefined : undefined,
          imageData: data,
          imageMimeType: isPdf ? "application/pdf" : isImage ? `image/${ext.slice(1)}` : "application/octet-stream",
          link: docMeta?.link ?? "",
          pessoa: docMeta?.pessoa,
        });
      }
    }

    fixtures.push({
      externalId: entry.externalId,
      reservation,
      groundTruth,
      documentContents,
    });
  }

  return fixtures;
}

// ---------------------------------------------------------------------------
// Run benchmark for one model × one fixture
// ---------------------------------------------------------------------------

async function benchmarkModel(
  model: ModelKey,
  fixture: FixtureData,
): Promise<ModelBenchResult> {
  const options = { modelKey: model };
  const contextJson = JSON.stringify(fixture.reservation, null, 2);
  const documentMap = mapDocumentsToAgents(fixture.documentContents);

  const agentResults: AgentBenchResult[] = [];
  const totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let totalTimeMs = 0;

  // Phase 1: Extraction
  const p1Start = Date.now();
  const extractionResults = await runExtraction(documentMap, contextJson, options);
  const p1Time = Date.now() - p1Start;

  for (const r of extractionResults) {
    const usage = r.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    agentResults.push({
      agent: r.pessoa ? `${r.agent}:${r.pessoa}` : r.agent,
      ok: r.ok,
      error: r.error,
      usage,
      timeMs: 0, // Individual timing not available from runExtraction (parallel)
      data: r.data,
    });
    totalUsage.promptTokens += usage.promptTokens;
    totalUsage.completionTokens += usage.completionTokens;
    totalUsage.totalTokens += usage.totalTokens;
  }
  totalTimeMs += p1Time;

  // Phase 2-3: Deterministic (no model cost)
  const financialComparison = runFinancialComparison(extractionResults);
  const plantaValidation = runPlantaValidation(extractionResults);

  // Phase 4: Cross-validation
  const p4Start = Date.now();
  const validationResult = await runCrossValidation(
    extractionResults,
    financialComparison,
    plantaValidation,
    options,
  );
  const p4Time = Date.now() - p4Start;

  const valUsage = validationResult.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  agentResults.push({
    agent: "validation-agent",
    ok: validationResult.ok,
    error: validationResult.error,
    usage: valUsage,
    timeMs: p4Time,
    data: validationResult.data,
  });
  totalUsage.promptTokens += valUsage.promptTokens;
  totalUsage.completionTokens += valUsage.completionTokens;
  totalUsage.totalTokens += valUsage.totalTokens;
  totalTimeMs += p4Time;

  const successCount = agentResults.filter((r) => r.ok).length;

  return {
    model,
    fixture: fixture.externalId,
    agents: agentResults,
    totalUsage,
    totalCost: calculateCost(model, totalUsage.promptTokens, totalUsage.completionTokens),
    totalTimeMs,
    successRate: agentResults.length > 0 ? successCount / agentResults.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Quality comparison against ground truth
// ---------------------------------------------------------------------------

type QualityResult = {
  model: ModelKey;
  fixture: string;
  matchRate: number;
  mismatches: FieldComparison[];
};

function evaluateQuality(
  benchResult: ModelBenchResult,
  groundTruth: Record<string, unknown> | null,
): QualityResult {
  if (!groundTruth) {
    return { model: benchResult.model, fixture: benchResult.fixture, matchRate: -1, mismatches: [] };
  }

  const gtResults = (groundTruth as { results?: Array<{ agent: string; data?: unknown }> }).results ?? [];
  const allComparisons: FieldComparison[] = [];

  for (const agentBench of benchResult.agents) {
    if (!agentBench.ok || !agentBench.data) continue;

    const gtAgent = gtResults.find(
      (r) => r.agent === agentBench.agent.split(":")[0],
    );
    if (!gtAgent?.data) continue;

    const comparisons = compareFields(
      gtAgent.data as Record<string, unknown>,
      agentBench.data as Record<string, unknown>,
    );
    allComparisons.push(...comparisons);
  }

  const matches = allComparisons.filter((c) => c.status === "match").length;
  const matchRate = allComparisons.length > 0 ? matches / allComparisons.length : -1;
  const mismatches = allComparisons.filter((c) => c.status !== "match");

  return { model: benchResult.model, fixture: benchResult.fixture, matchRate, mismatches };
}

// ---------------------------------------------------------------------------
// Report printer
// ---------------------------------------------------------------------------

type ModelSummary = {
  model: ModelKey;
  avgSuccessRate: number;
  avgMatchRate: number;
  totalTokens: number;
  totalCost: number;
  avgTimeMs: number;
  topMismatches: Array<{ field: string; agent: string; count: number }>;
};

function printReport(
  summaries: ModelSummary[],
  fixtureCount: number,
) {
  const modelCount = summaries.length;
  console.log("\n" + "═".repeat(72));
  console.log(`  MODEL BENCHMARK — ${fixtureCount} reserva(s) × ${modelCount} modelos`);
  console.log("═".repeat(72));

  // Header
  console.log(
    "\n" +
    padRight("Modelo", 20) +
    padRight("Sucesso", 10) +
    padRight("Match %", 10) +
    padRight("Tokens", 12) +
    padRight("Custo", 10) +
    padRight("Tempo", 10),
  );
  console.log("-".repeat(72));

  for (const s of summaries) {
    const matchStr = s.avgMatchRate >= 0 ? `${(s.avgMatchRate * 100).toFixed(1)}%` : "N/A";
    console.log(
      padRight(s.model, 20) +
      padRight(`${(s.avgSuccessRate * 100).toFixed(1)}%`, 10) +
      padRight(matchStr, 10) +
      padRight(formatTokens(s.totalTokens), 12) +
      padRight(`$${s.totalCost.toFixed(2)}`, 10) +
      padRight(`${(s.avgTimeMs / 1000).toFixed(1)}s`, 10),
    );
  }

  // Best picks
  console.log("\n" + "-".repeat(72));
  const cheapest = summaries.reduce((a, b) => (a.totalCost < b.totalCost ? a : b));
  const bestQuality = summaries
    .filter((s) => s.avgMatchRate >= 0)
    .reduce((a, b) => (a.avgMatchRate > b.avgMatchRate ? a : b), summaries[0]);
  const bestTradeoff = summaries
    .filter((s) => s.avgMatchRate >= 0)
    .reduce((a, b) => {
      const scoreA = a.avgMatchRate / Math.max(a.totalCost, 0.001);
      const scoreB = b.avgMatchRate / Math.max(b.totalCost, 0.001);
      return scoreA > scoreB ? a : b;
    }, summaries[0]);

  console.log(`  Menor custo:      ${cheapest.model}  $${cheapest.totalCost.toFixed(2)}`);
  if (bestQuality.avgMatchRate >= 0) {
    console.log(`  Melhor qualidade:  ${bestQuality.model}  ${(bestQuality.avgMatchRate * 100).toFixed(1)}% match`);
  }
  if (bestTradeoff.avgMatchRate >= 0) {
    console.log(`  Melhor tradeoff:   ${bestTradeoff.model}  ${(bestTradeoff.avgMatchRate * 100).toFixed(1)}% match / $${bestTradeoff.totalCost.toFixed(2)}`);
  }

  // Top mismatches
  const allMismatches = summaries.flatMap((s) => s.topMismatches);
  if (allMismatches.length > 0) {
    console.log("\nDIVERGÊNCIAS vs GROUND TRUTH:");
    for (const s of summaries) {
      for (const m of s.topMismatches.slice(0, 3)) {
        console.log(`  ${s.model}: campo "${m.field}" divergiu (${m.agent})`);
      }
    }
  }

  console.log("\n" + "═".repeat(72));
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("📂 Loading fixtures...");
  const fixtures = loadFixtures();
  console.log(`✅ Loaded ${fixtures.length} fixture(s)\n`);

  const allResults: ModelBenchResult[] = [];
  const allQuality: QualityResult[] = [];

  for (const fixture of fixtures) {
    console.log(`\n📋 Fixture: ${fixture.externalId} (${fixture.documentContents.length} documents)`);

    for (const model of modelsToTest) {
      console.log(`  🔄 Testing ${model}...`);
      try {
        const result = await benchmarkModel(model, fixture);
        allResults.push(result);

        const quality = evaluateQuality(result, fixture.groundTruth);
        allQuality.push(quality);

        const matchStr = quality.matchRate >= 0
          ? `${(quality.matchRate * 100).toFixed(1)}% match`
          : "no ground truth";
        console.log(
          `  ✅ ${model}: ${(result.successRate * 100).toFixed(0)}% success, ` +
          `${formatTokens(result.totalUsage.totalTokens)} tokens, ` +
          `$${result.totalCost.toFixed(2)}, ${matchStr}`,
        );
      } catch (err) {
        console.error(`  ❌ ${model}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Aggregate summaries per model
  const summaries: ModelSummary[] = modelsToTest.map((model) => {
    const modelResults = allResults.filter((r) => r.model === model);
    const modelQuality = allQuality.filter((q) => q.model === model);

    const avgSuccessRate =
      modelResults.reduce((sum, r) => sum + r.successRate, 0) / Math.max(modelResults.length, 1);
    const validMatchRates = modelQuality.filter((q) => q.matchRate >= 0);
    const avgMatchRate =
      validMatchRates.length > 0
        ? validMatchRates.reduce((sum, q) => sum + q.matchRate, 0) / validMatchRates.length
        : -1;
    const totalTokens = modelResults.reduce((sum, r) => sum + r.totalUsage.totalTokens, 0);
    const totalCost = modelResults.reduce((sum, r) => sum + r.totalCost, 0);
    const avgTimeMs =
      modelResults.reduce((sum, r) => sum + r.totalTimeMs, 0) / Math.max(modelResults.length, 1);

    // Collect mismatches
    const mismatchCounts = new Map<string, { agent: string; count: number }>();
    for (const q of modelQuality) {
      for (const m of q.mismatches) {
        const key = m.field;
        const existing = mismatchCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          mismatchCounts.set(key, { agent: "", count: 1 });
        }
      }
    }
    const topMismatches = Array.from(mismatchCounts.entries())
      .map(([field, { agent, count }]) => ({ field, agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { model, avgSuccessRate, avgMatchRate, totalTokens, totalCost, avgTimeMs, topMismatches };
  });

  printReport(summaries, fixtures.length);

  // Save raw results
  const resultsDir = path.resolve(process.cwd(), "backtest/results");
  fs.mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(resultsDir, `${timestamp}.json`);
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({ summaries, results: allResults, quality: allQuality }, null, 2),
  );
  console.log(`\n📊 Raw results saved to ${resultsPath}`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script compiles**

Run: `npx tsx --no-warnings -e "import './scripts/run-benchmark'" 2>&1 | head -5`

Check for syntax/import errors. The script won't run without fixtures, but should compile.

- [ ] **Step 3: Add npm scripts to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"benchmark:export": "tsx scripts/export-backtest.ts",
"benchmark:run": "tsx scripts/run-benchmark.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/run-benchmark.ts package.json
git commit -m "feat: add benchmark runner script with CLI report"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass. If any fail, fix before proceeding.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Verify env var placeholder**

Check `.env.local.example` has the `XAI_API_KEY` line.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final verification and fixes for model benchmark"
```

---

## Summary of files

| File | Action | Task |
|------|--------|------|
| `package.json` | Modify (add @ai-sdk/xai, npm scripts) | 1, 8 |
| `.env.local.example` | Modify (add XAI_API_KEY) | 1 |
| `.gitignore` | Modify (add /backtest) | 1 |
| `src/ai/_base/types.ts` | Modify (Provider, ModelKey, TokenUsage, AgentResult) | 1 |
| `src/ai/_base/llm.ts` | Modify (xAI models, usage capture, providerOptions) | 3 |
| `src/ai/_base/runAgent.ts` | Modify (accumulate usage across retries) | 4 |
| `src/ai/benchmark/pricing.ts` | Create | 2 |
| `src/ai/benchmark/comparator.ts` | Create | 6 |
| `scripts/export-backtest.ts` | Create | 7 |
| `scripts/run-benchmark.ts` | Create | 8 |
| `src/__tests__/ai/benchmark/pricing.test.ts` | Create | 2 |
| `src/__tests__/ai/_base/llm.test.ts` | Create | 3 |
| `src/__tests__/ai/_base/runAgent.test.ts` | Create | 4 |
| `src/__tests__/ai/benchmark/comparator.test.ts` | Create | 6 |
