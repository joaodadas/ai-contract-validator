import { PROMPT_KEYS, CRITICAL_PROMPT_KEYS, isPromptKey, PROMPT_KEY_LABELS } from "@/lib/prompt-keys";

describe("prompt-keys", () => {
  it("lists 14 keys: extraction-base + 13 extraction agents", () => {
    expect(PROMPT_KEYS).toHaveLength(14);
    expect(PROMPT_KEYS).toContain("extraction-base");
    expect(PROMPT_KEYS).toContain("cnh-agent");
    expect(PROMPT_KEYS).not.toContain("validation-agent");
  });

  it("marks quadro-resumo-agent and fluxo-agent as critical", () => {
    expect(CRITICAL_PROMPT_KEYS.has("quadro-resumo-agent")).toBe(true);
    expect(CRITICAL_PROMPT_KEYS.has("fluxo-agent")).toBe(true);
    expect(CRITICAL_PROMPT_KEYS.has("cnh-agent")).toBe(false);
    expect(CRITICAL_PROMPT_KEYS.has("extraction-base")).toBe(false);
  });

  it("isPromptKey type guard accepts valid keys and rejects others", () => {
    expect(isPromptKey("cnh-agent")).toBe(true);
    expect(isPromptKey("extraction-base")).toBe(true);
    expect(isPromptKey("validation-agent")).toBe(false);
    expect(isPromptKey("random")).toBe(false);
  });

  it("PROMPT_KEY_LABELS has a label for each key", () => {
    for (const k of PROMPT_KEYS) {
      expect(PROMPT_KEY_LABELS[k]).toBeDefined();
      expect(typeof PROMPT_KEY_LABELS[k]).toBe("string");
    }
  });
});
