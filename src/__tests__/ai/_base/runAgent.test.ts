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
