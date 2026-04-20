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
  it("contains all 8 model keys", () => {
    expect(Object.keys(MODEL_MAP)).toHaveLength(8);
    expect(MODEL_MAP).toHaveProperty("xai_grok3");
    expect(MODEL_MAP).toHaveProperty("xai_grok3_mini");
    expect(MODEL_MAP).toHaveProperty("xai_grok3_mini_nr");
    expect(MODEL_MAP).toHaveProperty("xai_grok41_fast");
    expect(MODEL_MAP).toHaveProperty("google_flash_lite_31");
  });
});

describe("DEFAULT_MODEL", () => {
  it("has defaults for both providers", () => {
    expect(DEFAULT_MODEL.google).toBe("google_flash_lite_31");
    expect(DEFAULT_MODEL.xai).toBe("xai_grok41_fast");
  });
});

describe("FALLBACK_MODEL", () => {
  it("maps xai_grok41_fast to google_flash_lite_31 (cross-provider)", () => {
    expect(FALLBACK_MODEL.xai_grok41_fast).toBe("google_flash_lite_31");
  });
});

describe("callLLM", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("returns usage from generateText response", async () => {
    mockGenerateText.mockResolvedValue({
      text: "response",
      usage: { inputTokens: 100, outputTokens: 50 },
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
      usage: { inputTokens: 10, outputTokens: 5 },
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
      usage: { inputTokens: 10, outputTokens: 5 },
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
