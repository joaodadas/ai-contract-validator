import { calculateCost, MODEL_PRICING } from "@/ai/benchmark/pricing";

describe("MODEL_PRICING", () => {
  it("has pricing for all model keys", () => {
    const keys = Object.keys(MODEL_PRICING);
    expect(keys).toHaveLength(8);
    expect(keys).toContain("google_pro");
    expect(keys).toContain("google_flash_25");
    expect(keys).toContain("google_flash_lite_31");
    expect(keys).toContain("google_flash");
    expect(keys).toContain("xai_grok3");
    expect(keys).toContain("xai_grok3_mini");
    expect(keys).toContain("xai_grok3_mini_nr");
    expect(keys).toContain("xai_grok41_fast");
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
