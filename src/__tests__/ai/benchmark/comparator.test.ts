import { compareFields, type FieldComparison } from "@/ai/benchmark/comparator";

describe("compareFields", () => {
  it("marks matching strings as match", () => {
    const result = compareFields(
      { nome: "João Silva" },
      { nome: "João Silva" },
    );
    expect(result).toEqual([
      { field: "nome", status: "match", expected: "João Silva", actual: "João Silva" },
    ]);
  });

  it("normalizes strings before comparing (trim, lowercase, accents)", () => {
    const result = compareFields(
      { nome: "  JOÃO SILVA  " },
      { nome: "joao silva" },
    );
    expect(result[0].status).toBe("match");
  });

  it("marks different strings as mismatch", () => {
    const result = compareFields(
      { nome: "João Silva" },
      { nome: "Maria Santos" },
    );
    expect(result[0].status).toBe("mismatch");
  });

  it("marks missing fields in actual as missing", () => {
    const result = compareFields(
      { nome: "João", cpf: "123" },
      { nome: "João" },
    );
    const cpfResult = result.find((r) => r.field === "cpf");
    expect(cpfResult?.status).toBe("missing");
  });

  it("compares numbers with R$ 1.00 tolerance", () => {
    const matchResult = compareFields(
      { valor: 1000.50 },
      { valor: 1001.00 },
    );
    expect(matchResult[0].status).toBe("match");

    const mismatchResult = compareFields(
      { valor: 1000.00 },
      { valor: 1002.00 },
    );
    expect(mismatchResult[0].status).toBe("mismatch");
  });

  it("handles null and undefined as equal", () => {
    const result = compareFields(
      { campo: null },
      { campo: undefined },
    );
    expect(result[0].status).toBe("match");
  });

  it("deep compares nested objects", () => {
    const result = compareFields(
      { output: { financeiro: { valor: 100 } } },
      { output: { financeiro: { valor: 100 } } },
    );
    expect(result[0].status).toBe("match");
  });

  it("deep compares arrays", () => {
    const matchResult = compareFields(
      { items: [1, 2, 3] },
      { items: [1, 2, 3] },
    );
    expect(matchResult[0].status).toBe("match");

    const mismatchResult = compareFields(
      { items: [1, 2, 3] },
      { items: [1, 2, 4] },
    );
    expect(mismatchResult[0].status).toBe("mismatch");
  });

  it("calculates match percentage", () => {
    const result = compareFields(
      { a: "same", b: "same", c: "diff" },
      { a: "same", b: "same", c: "other" },
    );
    const matches = result.filter((r) => r.status === "match").length;
    expect(matches / result.length).toBeCloseTo(0.6667, 2);
  });
});
