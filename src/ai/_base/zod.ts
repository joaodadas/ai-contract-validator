type ParseSuccess = { ok: true; value: unknown };
type ParseFailure = { ok: false; error: string };
type ParseResult = ParseSuccess | ParseFailure;

export function safeJsonParse(raw: string): ParseResult {
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    trimmed = fenceMatch[1].trim();
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    // Attempt to extract the first JSON object from the text
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return { ok: true, value: JSON.parse(match[0]) };
    } catch {
      return { ok: false, error: `Failed to parse extracted JSON block` };
    }
  }

  return { ok: false, error: "No valid JSON found in response" };
}
