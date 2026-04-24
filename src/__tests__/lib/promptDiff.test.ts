import { computePromptDiff } from "@/lib/prompt-diff";

describe("computePromptDiff", () => {
  it("returns added and removed line counts when text changes", () => {
    const d = computePromptDiff("line one\nline two", "line one\nline three");
    expect(d.added).toBeGreaterThanOrEqual(1);
    expect(d.removed).toBeGreaterThanOrEqual(1);
    expect(d.parts.some((p) => p.added)).toBe(true);
    expect(d.parts.some((p) => p.removed)).toBe(true);
  });

  it("returns zero added/removed when text is unchanged", () => {
    const d = computePromptDiff("same\ntext", "same\ntext");
    expect(d.added).toBe(0);
    expect(d.removed).toBe(0);
    expect(d.sizeDeltaPct).toBe(0);
  });

  it("flags large reduction (>20%)", () => {
    const oldText = "x".repeat(1000);
    const newText = "x".repeat(500);
    const d = computePromptDiff(oldText, newText);
    expect(d.largeReduction).toBe(true);
    expect(d.sizeDeltaPct).toBeLessThan(-20);
  });

  it("does not flag small reductions", () => {
    const d = computePromptDiff("x".repeat(1000), "x".repeat(900));
    expect(d.largeReduction).toBe(false);
  });

  it("handles empty old text gracefully", () => {
    const d = computePromptDiff("", "new content");
    expect(d.largeReduction).toBe(false);
    expect(d.added).toBeGreaterThan(0);
  });
});
