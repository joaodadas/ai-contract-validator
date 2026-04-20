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
