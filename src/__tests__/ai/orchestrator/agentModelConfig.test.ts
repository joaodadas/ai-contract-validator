import { resolveAgentOptions, AGENT_MODEL_DEFAULTS } from "@/ai/orchestrator/agentModelConfig";
import type { AgentInput } from "@/ai/_base/types";

const textOnlyInput: AgentInput = { text: "some text content" };

const inputWithImages: AgentInput = {
  text: "doc with image",
  images: [{ data: Buffer.from("fake"), mimeType: "image/jpeg" }],
};

const inputWithFiles: AgentInput = {
  text: "doc with scanned pdf",
  files: [{ data: Buffer.from("fake"), mimeType: "application/pdf" }],
};

describe("resolveAgentOptions", () => {
  describe("default model for all agents", () => {
    it("returns xai_grok41_fast for rgcpf-agent", () => {
      const result = resolveAgentOptions("rgcpf-agent", textOnlyInput);
      expect(result.modelKey).toBe("xai_grok41_fast");
    });

    it("returns xai_grok41_fast for fluxo-agent", () => {
      const result = resolveAgentOptions("fluxo-agent", textOnlyInput);
      expect(result.modelKey).toBe("xai_grok41_fast");
    });

    it("returns xai_grok41_fast for validation-agent", () => {
      const result = resolveAgentOptions("validation-agent", textOnlyInput);
      expect(result.modelKey).toBe("xai_grok41_fast");
    });
  });

  describe("no upgrade on images (UPGRADE_FLASH_ON_IMAGES is false)", () => {
    it("keeps xai_grok41_fast when input has images", () => {
      const result = resolveAgentOptions("rgcpf-agent", inputWithImages);
      expect(result.modelKey).toBe("xai_grok41_fast");
    });

    it("keeps xai_grok41_fast when input has files", () => {
      const result = resolveAgentOptions("cnh-agent", inputWithFiles);
      expect(result.modelKey).toBe("xai_grok41_fast");
    });
  });

  describe("explicit caller override", () => {
    it("respects explicit modelKey", () => {
      const result = resolveAgentOptions("rgcpf-agent", textOnlyInput, {
        modelKey: "google_pro",
      });
      expect(result.modelKey).toBe("google_pro");
    });

    it("respects explicit modelKey even with images", () => {
      const result = resolveAgentOptions("rgcpf-agent", inputWithImages, {
        modelKey: "google_flash_25",
      });
      expect(result.modelKey).toBe("google_flash_25");
    });
  });

  describe("preserves other options", () => {
    it("keeps temperature and maxTokens from baseOptions", () => {
      const result = resolveAgentOptions("rgcpf-agent", textOnlyInput, {
        temperature: 0.5,
        maxTokens: 4096,
      });
      expect(result.modelKey).toBe("xai_grok41_fast");
      expect(result.temperature).toBe(0.5);
      expect(result.maxTokens).toBe(4096);
    });
  });
});

describe("AGENT_MODEL_DEFAULTS", () => {
  it("assigns xai_grok41_fast to all agents", () => {
    const grokAgents = Object.entries(AGENT_MODEL_DEFAULTS)
      .filter(([, model]) => model === "xai_grok41_fast")
      .map(([agent]) => agent);

    expect(grokAgents).toHaveLength(14);
  });
});
