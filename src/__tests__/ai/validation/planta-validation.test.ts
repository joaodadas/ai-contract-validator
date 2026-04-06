import { validatePlanta } from "@/ai/validation/planta-validation";

describe("validatePlanta", () => {
  describe("exact match", () => {
    it("returns 'Igual' when bloco and unidade match exactly", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 108" },
        { bloco: "BLOCO 11", unidades: [{ unidade: "AP 108" }] }
      );
      expect(result.status).toBe("Igual");
      expect(result.dadosComparados.blocoReserva).toBe("11");
      expect(result.dadosComparados.unidadeReserva).toBe("108");
      expect(result.dadosComparados.blocoPlanta).toBe("11");
      expect(result.dadosComparados.unidadePlanta).toBe("AP 108");
    });
  });

  describe("prefix normalization", () => {
    it("returns 'Igual' when planta unidade lacks AP prefix", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 108" },
        { bloco: "BLOCO 11", unidades: [{ unidade: "108" }] }
      );
      expect(result.status).toBe("Igual");
    });

    it("returns 'Igual' when reserva lacks BLOCO and AP prefixes", () => {
      const result = validatePlanta(
        { bloco: "11", numero: "108" },
        { bloco: "BLOCO 11", unidades: [{ unidade: "AP 108" }] }
      );
      expect(result.status).toBe("Igual");
    });
  });

  describe("leading zeros", () => {
    it("returns 'Igual' when values contain leading zeros", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 05", numero: "AP 08" },
        { bloco: "BLOCO 05", unidades: [{ unidade: "AP 08" }] }
      );
      expect(result.status).toBe("Igual");
    });
  });

  describe("missing reserva", () => {
    it("returns 'Erro' when reserva is null", () => {
      const result = validatePlanta(null, {
        bloco: "BLOCO 11",
        unidades: [{ unidade: "AP 108" }],
      });
      expect(result.status).toBe("Erro");
      expect(result.mensagem).toContain("Reserva");
    });

    it("returns 'Erro' when reserva is undefined", () => {
      const result = validatePlanta(undefined, {
        bloco: "BLOCO 11",
        unidades: [{ unidade: "AP 108" }],
      });
      expect(result.status).toBe("Erro");
      expect(result.mensagem).toContain("Reserva");
    });
  });

  describe("missing planta", () => {
    it("returns 'Atenção' when planta is null", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 108" },
        null
      );
      expect(result.status).toBe("Atenção");
      expect(result.dadosComparados.blocoReserva).toBe("BLOCO 11");
      expect(result.dadosComparados.unidadeReserva).toBe("AP 108");
    });

    it("returns 'Atenção' when planta is undefined", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 108" },
        undefined
      );
      expect(result.status).toBe("Atenção");
    });
  });

  describe("bloco mismatch", () => {
    it("returns 'Diferente' when blocos do not match", () => {
      const result = validatePlanta(
        { bloco: "11", numero: "AP 108" },
        { bloco: "12", unidades: [{ unidade: "AP 108" }] }
      );
      expect(result.status).toBe("Diferente");
      expect(result.mensagem).toContain("Blocos divergentes");
    });
  });

  describe("unit not found", () => {
    it("returns 'Diferente' when unidade is not in planta list", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 999" },
        { bloco: "BLOCO 11", unidades: [{ unidade: "AP 108" }] }
      );
      expect(result.status).toBe("Diferente");
      expect(result.mensagem).toContain("unidade");
    });
  });

  describe("empty unidades array", () => {
    it("returns 'Diferente' when unidades array is empty", () => {
      const result = validatePlanta(
        { bloco: "BLOCO 11", numero: "AP 108" },
        { bloco: "BLOCO 11", unidades: [] }
      );
      expect(result.status).toBe("Diferente");
    });
  });
});
