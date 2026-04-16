import {
  fetchReserva,
  fetchContratos,
  alterarSituacao,
  enviarMensagem,
} from "@/lib/cvcrm/client";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("cvcrm/client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ── fetchReserva ──────────────────────────────────────────────

  describe("fetchReserva", () => {
    it("returns parsed JSON on success", async () => {
      const payload = { id: 1, situacao: "Ativa" };
      mockFetch.mockReturnValueOnce(jsonResponse(payload));

      const result = await fetchReserva(1);

      expect(result).toEqual(payload);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://test.cvcrm.com.br/api/cvio/reserva/1");
      expect(options.headers).toMatchObject({
        email: "test@test.com",
        token: "test-token",
        "Content-Type": "application/json",
      });
    });

    it("throws on HTTP error (e.g. 404)", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ error: "not found" }, 404));

      await expect(fetchReserva(999)).rejects.toThrow(/CVCRM erro 404/);
    });
  });

  // ── fetchContratos ────────────────────────────────────────────

  describe("fetchContratos", () => {
    it("returns array when API responds with direct array format", async () => {
      const contratos = [{ contrato: "Ato" }];
      mockFetch.mockReturnValueOnce(jsonResponse(contratos));

      const result = await fetchContratos(10);

      expect(result).toEqual(contratos);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://test.cvcrm.com.br/api/v1/comercial/reservas/10/contratos"
      );
    });

    it("extracts array from nested {dados:{contratos}} format", async () => {
      const contratos = [{ contrato: "Ato" }];
      mockFetch.mockReturnValueOnce(
        jsonResponse({ dados: { contratos } })
      );

      const result = await fetchContratos(10);

      expect(result).toEqual(contratos);
    });

    it("returns empty array for unexpected response shape", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({}));

      const result = await fetchContratos(10);

      expect(result).toEqual([]);
    });
  });

  // ── alterarSituacao ───────────────────────────────────────────

  describe("alterarSituacao", () => {
    it("sends POST with correct URL and body, using defaults", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ sucesso: true, mensagem: "ok" })
      );

      const result = await alterarSituacao(5, 2);

      expect(result).toEqual({ sucesso: true, mensagem: "ok" });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "https://test.cvcrm.com.br/api/v1/comercial/reservas/alterar-situacao"
      );
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        idreserva_cv: 5,
        idsituacao_destino: 2,
        descricao: "Contrato com pendencia",
        comentario: "Validação por IA",
      });
    });

    it("uses custom descricao and comentario when provided", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await alterarSituacao(5, 2, "Desc custom", "Comentario custom");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.descricao).toBe("Desc custom");
      expect(body.comentario).toBe("Comentario custom");
    });
  });

  // ── enviarMensagem ────────────────────────────────────────────

  describe("enviarMensagem", () => {
    it("sends POST with mensagem and default boolean options", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      const result = await enviarMensagem(7, "Olá mundo");

      expect(result).toEqual({ sucesso: true });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "https://test.cvcrm.com.br/api/v2/comercial/reservas/mensagens"
      );
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        idreserva: 7,
        mensagem: "Olá mundo",
        exibir_imobiliaria: true,
        enviar_email_imobiliaria: true,
        exibir_corretor: true,
        enviar_email_corretor: true,
        exibir_correspondente: true,
        enviar_email_correspondente: true,
        exibir_repasse: false,
      });
    });

    it("custom options override defaults", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await enviarMensagem(7, "msg", {
        exibirImobiliaria: false,
        enviarEmailImobiliaria: false,
        exibirRepasse: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.exibir_imobiliaria).toBe(false);
      expect(body.enviar_email_imobiliaria).toBe(false);
      expect(body.exibir_repasse).toBe(true);
      // Non-overridden options keep defaults
      expect(body.exibir_corretor).toBe(true);
      expect(body.enviar_email_corretor).toBe(true);
      expect(body.exibir_correspondente).toBe(true);
      expect(body.enviar_email_correspondente).toBe(true);
    });
  });

  // ── alterarSituacao — cenários do Mauricio ────────────────────

  describe("alterarSituacao — cenários CVCRM", () => {
    it("cenário 38: Contrato Validado com comentário correto", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await alterarSituacao(22718, 38, "Contrato Validado", "Validado por IA");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        idreserva_cv: 22718,
        idsituacao_destino: 38,
        descricao: "Contrato Validado",
        comentario: "Validado por IA",
      });
    });

    it("cenário 39: Contrato com Pendencia", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await alterarSituacao(22718, 39, "Contrato com Pendencia", "Validado por IA");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.idsituacao_destino).toBe(39);
      expect(body.descricao).toBe("Contrato com Pendencia");
      expect(body.comentario).toBe("Validado por IA");
    });

    it("cenário 40: Documentos faltantes", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await alterarSituacao(22718, 40, "Contrato com Pendencia", "Validado por IA");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.idsituacao_destino).toBe(40);
      expect(body.descricao).toBe("Contrato com Pendencia");
    });

    it("throws on HTTP error from alterarSituacao", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "bloqueado" }, 403)
      );

      await expect(
        alterarSituacao(22718, 38, "Contrato Validado", "Validado por IA"),
      ).rejects.toThrow(/CVCRM erro 403/);
    });
  });

  // ── enviarMensagem — parâmetros do Mauricio ──────────────────

  describe("enviarMensagem — parâmetros CVCRM", () => {
    it("envia com todos os parâmetros padrão corretos (Mauricio spec)", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sucesso: true }));

      await enviarMensagem(22718, "pendencias encontradas");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Verificar cada parâmetro que Mauricio especificou
      expect(body.idreserva).toBe(22718);
      expect(body.mensagem).toBe("pendencias encontradas");
      expect(body.exibir_imobiliaria).toBe(true);
      expect(body.enviar_email_imobiliaria).toBe(true);
      expect(body.enviar_email_corretor).toBe(true);
      expect(body.exibir_correspondente).toBe(true);
      expect(body.enviar_email_correspondente).toBe(true);
      expect(body.exibir_repasse).toBe(false);
    });

    it("throws on HTTP error from enviarMensagem", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "reserva bloqueada" }, 422)
      );

      await expect(
        enviarMensagem(22718, "teste"),
      ).rejects.toThrow(/CVCRM erro 422/);
    });
  });

  // ── Environment validation ────────────────────────────────────

  describe("environment validation", () => {
    const originalBaseUrl = process.env.CVCRM_BASE_URL;
    const originalEmail = process.env.CVCRM_EMAIL;
    const originalToken = process.env.CVCRM_TOKEN;

    afterEach(() => {
      // Restore env vars
      process.env.CVCRM_BASE_URL = originalBaseUrl;
      process.env.CVCRM_EMAIL = originalEmail;
      process.env.CVCRM_TOKEN = originalToken;
      jest.resetModules();
    });

    it("throws when CVCRM_BASE_URL is missing", async () => {
      delete process.env.CVCRM_BASE_URL;
      jest.resetModules();

      const { fetchReserva: freshFetchReserva } = await import(
        "@/lib/cvcrm/client"
      );

      await expect(freshFetchReserva(1)).rejects.toThrow(
        /Variáveis de ambiente/
      );
    });
  });
});
