import { runAgent } from "@/ai/_base/runAgent";
import { callLLM } from "@/ai/_base/llm";
import { z } from "zod";

jest.mock("@/ai/_base/llm");
const mockedCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

describe("runAgent — promptVersion propagation", () => {
  beforeEach(() => {
    mockedCallLLM.mockResolvedValue({
      text: '{"ok":true}',
      provider: "google",
      model: "gemini-2.5-pro",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    } as never);
  });

  it("records promptVersion in the result when provided (success path)", async () => {
    const schema = z.object({ ok: z.boolean() });
    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "P",
      promptVersion: "base:v2|cnh-agent:v7",
      userInput: { text: "go" },
      schema,
    });
    expect(result.ok).toBe(true);
    expect(result.promptVersion).toBe("base:v2|cnh-agent:v7");
  });

  it("records promptVersion even on failure path", async () => {
    mockedCallLLM.mockRejectedValue(new Error("network fail"));
    const schema = z.object({ ok: z.boolean() });
    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "P",
      promptVersion: "base:v0|cnh-agent:v0",
      userInput: { text: "go" },
      schema,
    });
    expect(result.ok).toBe(false);
    expect(result.promptVersion).toBe("base:v0|cnh-agent:v0");
  });

  it("records promptVersion undefined when not provided", async () => {
    const schema = z.object({ ok: z.boolean() });
    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "P",
      userInput: { text: "go" },
      schema,
    });
    expect(result.promptVersion).toBeUndefined();
  });
});
