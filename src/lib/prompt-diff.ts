import { diffLines } from "diff";

export type DiffPart = { value: string; added?: boolean; removed?: boolean };

export type PromptDiff = {
  parts: DiffPart[];
  added: number;
  removed: number;
  sizeDeltaPct: number;
  largeReduction: boolean;
};

export function computePromptDiff(oldText: string, newText: string): PromptDiff {
  const parts = diffLines(oldText, newText);

  let added = 0;
  let removed = 0;
  for (const p of parts) {
    const lines = p.value.split("\n").filter((l) => l.length > 0).length;
    if (p.added) added += lines;
    if (p.removed) removed += lines;
  }

  const oldLen = oldText.length || 1; // avoid div by zero
  const newLen = newText.length;
  const sizeDeltaPct = ((newLen - oldLen) / oldLen) * 100;
  const largeReduction = sizeDeltaPct < -20;

  return { parts, added, removed, sizeDeltaPct, largeReduction };
}
