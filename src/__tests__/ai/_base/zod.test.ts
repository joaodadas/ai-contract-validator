import { safeJsonParse } from "@/ai/_base/zod";

describe("safeJsonParse", () => {
  describe("valid JSON", () => {
    it("parses a plain JSON object", () => {
      const result = safeJsonParse('{"key": "value"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as Record<string, unknown>).key).toBe("value");
      }
    });

    it("parses JSON with surrounding whitespace", () => {
      const result = safeJsonParse('  {"key": "value"}  ');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as Record<string, unknown>).key).toBe("value");
      }
    });
  });

  describe("JSON with code fences", () => {
    it("strips ```json code fences", () => {
      const input = '```json\n{"key": "value"}\n```';
      const result = safeJsonParse(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as Record<string, unknown>).key).toBe("value");
      }
    });

    it("strips ``` code fences without language tag", () => {
      const input = '```\n{"key": "value"}\n```';
      const result = safeJsonParse(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as Record<string, unknown>).key).toBe("value");
      }
    });
  });

  describe("JSON with extra text (regex fallback)", () => {
    it("extracts JSON object from surrounding prose", () => {
      const input = 'Here is the result: {"key": "value"} done';
      const result = safeJsonParse(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as Record<string, unknown>).key).toBe("value");
      }
    });
  });

  describe("nested JSON", () => {
    it("parses nested objects correctly", () => {
      const input = '{"outer": {"inner": 1}}';
      const result = safeJsonParse(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const value = result.value as { outer: { inner: number } };
        expect(value.outer.inner).toBe(1);
      }
    });
  });

  describe("invalid and edge cases", () => {
    it("returns ok:false for empty string", () => {
      const result = safeJsonParse("");
      expect(result.ok).toBe(false);
    });

    it("returns ok:false for non-JSON text", () => {
      const result = safeJsonParse("not json at all");
      expect(result.ok).toBe(false);
    });

    it("returns ok:false for truncated JSON (no closing brace)", () => {
      const result = safeJsonParse('{"truncated": ');
      expect(result.ok).toBe(false);
    });

    it("parses 'null' as valid JSON (JSON.parse succeeds)", () => {
      const result = safeJsonParse("null");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });
});
