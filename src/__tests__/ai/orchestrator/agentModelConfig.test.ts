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
  describe("flash agents with text-only input", () => {
    it("returns google_flash_25 for rgcpf-agent", () => {
      const result = resolveAgentOptions("rgcpf-agent", textOnlyInput);
      expect(result.modelKey).toBe("google_flash_25");
    });

    it("returns google_flash_25 for fluxo-agent", () => {
      const result = resolveAgentOptions("fluxo-agent", textOnlyInput);
      expect(result.modelKey).toBe("google_flash_25");
    });
  });

  describe("flash agents with visual input (upgrade to pro)", () => {
    it("upgrades to google_pro when input has images", () => {
      const result = resolveAgentOptions("rgcpf-agent", inputWithImages);
      expect(result.modelKey).toBe("google_pro");
    });

    it("upgrades to google_pro when input has files (scanned PDFs)", () => {
      const result = resolveAgentOptions("cnh-agent", inputWithFiles);
      expect(result.modelKey).toBe("google_pro");
    });
  });

  describe("pro agents always stay pro", () => {
    it("returns google_pro for validation-agent regardless of input", () => {
      const result = resolveAgentOptions("validation-agent", textOnlyInput);
      expect(result.modelKey).toBe("google_pro");
    });
  });

  describe("explicit caller override", () => {
    it("respects explicit modelKey even for flash agents", () => {
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
      expect(result.modelKey).toBe("google_flash_25");
      expect(result.temperature).toBe(0.5);
      expect(result.maxTokens).toBe(4096);
    });
  });
});

describe("AGENT_MODEL_DEFAULTS", () => {
  it("assigns pro only to validation-agent", () => {
    const proAgents = Object.entries(AGENT_MODEL_DEFAULTS)
      .filter(([, model]) => model === "google_pro")
      .map(([agent]) => agent);

    expect(proAgents).toEqual(["validation-agent"]);
  });

  it("assigns flash to all other agents", () => {
    const flashAgents = Object.entries(AGENT_MODEL_DEFAULTS)
      .filter(([, model]) => model === "google_flash_25")
      .map(([agent]) => agent);

    expect(flashAgents).toHaveLength(13);
  });
});
