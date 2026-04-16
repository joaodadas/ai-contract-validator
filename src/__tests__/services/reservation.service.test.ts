import { confirmReservation, runAgentAnalysis, reprocessReservation, validateReprocessable } from "@/services/reservation.service";
import { getReservationById, insertReservationAudit, insertAuditLog, updateReservationStatus } from "@/db/queries";
import { alterarSituacao, enviarMensagem } from "@/lib/cvcrm/client";
import { analyzeContract, checkDocumentCompleteness } from "@/ai";
import { downloadAllDocuments } from "@/lib/cvcrm/documentDownloader";
import { mapDocumentsToAgents } from "@/ai/orchestrator/agentDocumentMapper";
import type { ContractAnalysis } from "@/ai";
import type { ReservaProcessada } from "@/lib/cvcrm/types";

// ── Module mocks ───────────────────────────────────────────────

jest.mock("@/db", () => {
  const mockWhere = jest.fn().mockResolvedValue(undefined);
  const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
  return {
    db: { update: mockUpdate },
    __mockUpdate: mockUpdate,
    __mockSet: mockSet,
    __mockWhere: mockWhere,
  };
});

jest.mock("@/db/queries", () => ({
  getReservationById: jest.fn(),
  getReservationByExternalId: jest.fn(),
  updateReservationStatus: jest.fn(),
  insertReservationAudit: jest.fn(),
  insertAuditLog: jest.fn(),
}));

jest.mock("@/lib/cvcrm/client", () => ({
  fetchReserva: jest.fn(),
  fetchContratos: jest.fn(),
  fetchDocumentos: jest.fn(),
  alterarSituacao: jest.fn(),
  enviarMensagem: jest.fn(),
}));

jest.mock("@/ai", () => ({
  analyzeContract: jest.fn(),
  checkDocumentCompleteness: jest.fn(),
}));

jest.mock("@/lib/cvcrm/documentDownloader", () => ({
  downloadAllDocuments: jest.fn(),
}));

jest.mock("@/ai/orchestrator/agentDocumentMapper", () => ({
  mapDocumentsToAgents: jest.fn(),
}));

// ── Typed mocks ────────────────────────────────────────────────

const mockGetReservationById = getReservationById as jest.MockedFunction<typeof getReservationById>;
const mockAlterarSituacao = alterarSituacao as jest.MockedFunction<typeof alterarSituacao>;
const mockEnviarMensagem = enviarMensagem as jest.MockedFunction<typeof enviarMensagem>;
const mockInsertReservationAudit = insertReservationAudit as jest.MockedFunction<typeof insertReservationAudit>;
const mockInsertAuditLog = insertAuditLog as jest.MockedFunction<typeof insertAuditLog>;
const mockUpdateReservationStatus = updateReservationStatus as jest.MockedFunction<typeof updateReservationStatus>;
const mockAnalyzeContract = analyzeContract as jest.MockedFunction<typeof analyzeContract>;
const mockCheckDocumentCompleteness = checkDocumentCompleteness as jest.MockedFunction<typeof checkDocumentCompleteness>;
const mockDownloadAllDocuments = downloadAllDocuments as jest.MockedFunction<typeof downloadAllDocuments>;
const mockMapDocumentsToAgents = mapDocumentsToAgents as jest.MockedFunction<typeof mapDocumentsToAgents>;

// ── Helpers ────────────────────────────────────────────────────

function makeReservation(
  overrides: Record<string, unknown> = {}
): {
  id: string;
  externalId: string;
  enterprise: string;
  titularNome: string | null;
  cvcrmSnapshot: unknown;
  cvcrmSituacao: string | null;
  status: "pending" | "approved" | "divergent" | "confirmed";
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: "uuid-123",
    externalId: "22718",
    enterprise: "Empreendimento Teste",
    titularNome: "João Silva",
    cvcrmSnapshot: {},
    cvcrmSituacao: null,
    status: "approved",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ReservaProcessada> = {}): ReservaProcessada {
  return {
    reservaId: 22718,
    transacaoId: 1,
    situacao: "Em análise",
    planta: {
      empreendimento: "Kentucky",
      andar: 1,
      bloco: "BLOCO 11",
      numero: "AP 108",
    },
    pessoas: {
      titular: {
        nome: "João Silva",
        documento: "00000000000",
        documento_tipo: "cpf",
        email: "joao@email.com",
        telefone: "",
        celular: "",
        rg: "",
        rg_orgao_emissor: "",
        nascimento: "",
        estado_civil: "",
        endereco: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        sexo: "",
        renda_familiar: null,
        porcentagem: 100,
        idpessoa_cv: 1,
      },
      associados: {},
    },
    contratos: [],
    documentos: {},
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<ContractAnalysis> = {}): ContractAnalysis {
  return {
    ok: true,
    results: [],
    summary: { failed_agents: [], totals: {} },
    formattedReport: "Nenhuma divergência encontrada",
    ...overrides,
  };
}

/** Setup common mocks for runAgentAnalysis tests */
function setupAgentAnalysisMocks() {
  mockInsertReservationAudit.mockResolvedValue({ id: "audit-1" } as never);
  mockInsertAuditLog.mockResolvedValue(undefined as never);
  mockUpdateReservationStatus.mockResolvedValue(undefined as never);
  mockDownloadAllDocuments.mockResolvedValue([]);
  mockMapDocumentsToAgents.mockReturnValue(new Map());
  mockEnviarMensagem.mockResolvedValue({ sucesso: true } as never);
  mockAlterarSituacao.mockResolvedValue({ sucesso: true } as never);
}

// ── Tests ──────────────────────────────────────────────────────

describe("confirmReservation", () => {
  const originalEnv = process.env.CVCRM_SYNC_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CVCRM_SYNC_ENABLED = "false";
  });

  afterEach(() => {
    process.env.CVCRM_SYNC_ENABLED = originalEnv;
  });

  // 1. Successful confirmation with sync disabled
  it("confirms reservation and returns synced:false when CVCRM_SYNC_ENABLED is disabled", async () => {
    process.env.CVCRM_SYNC_ENABLED = "false";
    mockGetReservationById.mockResolvedValueOnce(makeReservation());

    const result = await confirmReservation("uuid-123", 38, "Aprovado");

    expect(mockGetReservationById).toHaveBeenCalledWith("uuid-123");
    expect(mockAlterarSituacao).not.toHaveBeenCalled();
    expect(result).toEqual({
      synced: false,
      reason: expect.stringContaining("disabled"),
    });
  });

  // 2. Successful confirmation with sync enabled
  it("confirms reservation and syncs with CVCRM when sync is enabled", async () => {
    process.env.CVCRM_SYNC_ENABLED = "true";
    mockGetReservationById.mockResolvedValueOnce(makeReservation());
    mockAlterarSituacao.mockResolvedValueOnce({ sucesso: true } as never);

    const result = await confirmReservation("uuid-123", 38, "Aprovado");

    expect(mockGetReservationById).toHaveBeenCalledWith("uuid-123");
    expect(mockAlterarSituacao).toHaveBeenCalledWith(22718, 38);
    expect(result).toEqual({ synced: true });
  });

  // 3. Reservation not found
  it("throws when reservation is not found", async () => {
    mockGetReservationById.mockResolvedValueOnce(undefined);

    await expect(
      confirmReservation("uuid-404", 38, "Aprovado")
    ).rejects.toThrow("não encontrada");
  });

  // 4. Invalid status (pending)
  it("throws when reservation has invalid status for confirmation", async () => {
    mockGetReservationById.mockResolvedValueOnce(
      makeReservation({ status: "pending" })
    );

    await expect(
      confirmReservation("uuid-123", 38, "Aprovado")
    ).rejects.toThrow("não pode ser confirmada");
  });

  // 5. CVCRM sync fails gracefully
  it("returns synced:false with error message when CVCRM sync fails", async () => {
    process.env.CVCRM_SYNC_ENABLED = "true";
    mockGetReservationById.mockResolvedValueOnce(makeReservation());
    mockAlterarSituacao.mockRejectedValueOnce(new Error("CVCRM timeout"));

    const result = await confirmReservation("uuid-123", 38, "Aprovado");

    expect(result).toEqual({
      synced: false,
      error: expect.stringContaining("timeout"),
    });
  });

  // Additional: divergent status is also valid for confirmation
  it("allows confirmation when reservation status is divergent", async () => {
    process.env.CVCRM_SYNC_ENABLED = "false";
    mockGetReservationById.mockResolvedValueOnce(
      makeReservation({ status: "divergent" })
    );

    const result = await confirmReservation("uuid-123", 39, "Pendente");

    expect(result).toEqual({
      synced: false,
      reason: expect.stringContaining("disabled"),
    });
  });

  // Additional: confirmed status should also be rejected
  it("throws when reservation is already confirmed", async () => {
    mockGetReservationById.mockResolvedValueOnce(
      makeReservation({ status: "confirmed" })
    );

    await expect(
      confirmReservation("uuid-123", 38, "Aprovado")
    ).rejects.toThrow("não pode ser confirmada");
  });
});

// ── runAgentAnalysis — CVCRM sync tests ───────────────────────

describe("runAgentAnalysis", () => {
  const originalEnv = process.env.CVCRM_SYNC_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CVCRM_SYNC_ENABLED = "true";
    setupAgentAnalysisMocks();
  });

  afterEach(() => {
    process.env.CVCRM_SYNC_ENABLED = originalEnv;
  });

  // ── Cenário 1: Análise OK, sem divergências → situação 38 ──

  describe("análise sem divergências", () => {
    it("envia mensagem e altera situação para 38 (Contrato Validado)", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).toHaveBeenCalledWith(
        22718,
        "Nenhuma divergência encontrada",
      );
      expect(mockAlterarSituacao).toHaveBeenCalledWith(
        22718,
        38,
        "Contrato Validado",
        "Validado por IA",
      );
    });

    it("atualiza status no banco para approved", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockUpdateReservationStatus).toHaveBeenCalledWith(
        "reservation-1",
        "approved",
      );
    });
  });

  // ── Cenário 2: Análise com divergências → situação 39 ──────

  describe("análise com divergências", () => {
    it("envia mensagem com relatório e altera situação para 39 (Contrato com Pendencia)", async () => {
      const report = "**Financiamento**: Divergente\n- Detalhes: Diff 1693";
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: report }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).toHaveBeenCalledWith(22718, report);
      expect(mockAlterarSituacao).toHaveBeenCalledWith(
        22718,
        39,
        "Contrato com Pendencia",
        "Validado por IA",
      );
    });

    it("atualiza status no banco para divergent", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "**Erro**: valor divergente" }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockUpdateReservationStatus).toHaveBeenCalledWith(
        "reservation-1",
        "divergent",
      );
    });
  });

  // ── Cenário 3: Documentos faltando → situação 40 ───────────

  describe("documentos obrigatórios faltando", () => {
    it("envia mensagem de documentos faltantes e altera situação para 40", async () => {
      const missingMessage = "Faltam os seguintes documentos obrigatórios: Planta; Quadro Resumo.";
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: false,
        missingGroups: ["Planta", "Quadro Resumo"],
        documentTypes: [],
        message: missingMessage,
      });

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).toHaveBeenCalledWith(22718, missingMessage);
      expect(mockAlterarSituacao).toHaveBeenCalledWith(
        22718,
        40,
        "Contrato com Pendencia",
        "Validado por IA",
      );
      // Não deve rodar a análise de IA
      expect(mockAnalyzeContract).not.toHaveBeenCalled();
    });
  });

  // ── Cenário 4: Validation-agent falha → sync DEVE acontecer ─

  describe("validation-agent falha (formattedReport undefined)", () => {
    it("ainda envia mensagem e altera situação mesmo sem formattedReport", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      // validation-agent falhou → formattedReport é undefined
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: undefined }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      // Deve enviar mensagem fallback e alterar situação
      expect(mockEnviarMensagem).toHaveBeenCalledWith(22718, expect.any(String));
      expect(mockAlterarSituacao).toHaveBeenCalled();
    });
  });

  // ── Cenário 5: Erro fatal na pipeline → sync DEVE acontecer ─

  describe("erro fatal na análise", () => {
    it("envia mensagem de erro e altera situação para 39 quando analyzeContract explode", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockRejectedValue(new Error("LLM timeout"));

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).toHaveBeenCalledWith(22718, expect.any(String));
      expect(mockAlterarSituacao).toHaveBeenCalledWith(
        22718,
        39,
        "Contrato com Pendencia",
        "Validado por IA",
      );
    });
  });

  // ── Cenário 6: Sync desativado ──────────────────────────────

  describe("CVCRM_SYNC_ENABLED=false", () => {
    it("não chama enviarMensagem nem alterarSituacao quando sync desativado", async () => {
      process.env.CVCRM_SYNC_ENABLED = "false";
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "Todos os requisitos obrigatórios foram atendidos.",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).not.toHaveBeenCalled();
      expect(mockAlterarSituacao).not.toHaveBeenCalled();
    });

    it("não faz sync no cenário de documentos faltando quando desativado", async () => {
      process.env.CVCRM_SYNC_ENABLED = "false";
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: false,
        missingGroups: ["Planta"],
        documentTypes: [],
        message: "Faltam documentos.",
      });

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockEnviarMensagem).not.toHaveBeenCalled();
      expect(mockAlterarSituacao).not.toHaveBeenCalled();
    });
  });

  // ── Cenário 7: Resiliência do sync ─────────────────────────

  describe("resiliência do sync", () => {
    it("não propaga erro se enviarMensagem falhar — análise continua", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "OK",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
      );
      mockEnviarMensagem.mockRejectedValue(new Error("Network error"));

      // Should NOT throw
      await expect(
        runAgentAnalysis("reservation-1", makeSnapshot()),
      ).resolves.not.toThrow();
    });

    it("não propaga erro se alterarSituacao falhar — análise continua", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "OK",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
      );
      mockAlterarSituacao.mockRejectedValue(new Error("CVCRM 500"));

      await expect(
        runAgentAnalysis("reservation-1", makeSnapshot()),
      ).resolves.not.toThrow();
    });

    it("não propaga erro se sync falhar no cenário de documentos faltando", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: false,
        missingGroups: ["Planta"],
        documentTypes: [],
        message: "Faltam documentos.",
      });
      mockEnviarMensagem.mockRejectedValue(new Error("CVCRM down"));

      await expect(
        runAgentAnalysis("reservation-1", makeSnapshot()),
      ).resolves.not.toThrow();
    });
  });

  // ── Cenário 8: Agentes com falhas parciais ─────────────────

  describe("agentes com falhas parciais", () => {
    it("marca como divergent quando há failed_agents mesmo sem divergências no report", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "OK",
      });
      mockAnalyzeContract.mockResolvedValue(
        makeAnalysis({
          formattedReport: "Nenhuma divergência encontrada",
          summary: { failed_agents: ["cnh-agent" as never], totals: {} },
        }),
      );

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockUpdateReservationStatus).toHaveBeenCalledWith(
        "reservation-1",
        "divergent",
      );
    });
  });

  // ── Cenário 9: Audit log tracking ─────────────────────────

  describe("audit log tracking", () => {
    it("cria audit record no início da análise", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: true,
        missingGroups: [],
        documentTypes: [],
        message: "OK",
      });
      mockAnalyzeContract.mockResolvedValue(makeAnalysis());

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockInsertReservationAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: "reservation-1",
          status: "approved",
        }),
      );
    });

    it("registra log de warning para documentos faltando", async () => {
      mockCheckDocumentCompleteness.mockReturnValue({
        complete: false,
        missingGroups: ["Planta"],
        documentTypes: [],
        message: "Faltam documentos.",
      });

      await runAgentAnalysis("reservation-1", makeSnapshot());

      expect(mockInsertAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warning",
          message: expect.stringContaining("Planta"),
        }),
      );
    });
  });
});

// ── validateReprocessable ──────────────────────────────────────

describe("validateReprocessable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when reservation is not found", async () => {
    mockGetReservationById.mockResolvedValueOnce(undefined);
    await expect(validateReprocessable("uuid-404")).rejects.toThrow("não encontrada");
  });

  it("throws when reservation status is pending", async () => {
    mockGetReservationById.mockResolvedValueOnce(makeReservation({ status: "pending" }));
    await expect(validateReprocessable("uuid-123")).rejects.toThrow("já está em processamento");
  });

  it("throws when reservation has no snapshot", async () => {
    mockGetReservationById.mockResolvedValueOnce(
      makeReservation({ status: "divergent", cvcrmSnapshot: null }),
    );
    await expect(validateReprocessable("uuid-123")).rejects.toThrow("não possui snapshot");
  });

  it("returns reservation and snapshot when valid", async () => {
    const snapshot = makeSnapshot();
    mockGetReservationById.mockResolvedValueOnce(
      makeReservation({ status: "divergent", cvcrmSnapshot: snapshot }),
    );

    const result = await validateReprocessable("uuid-123");
    expect(result.reservation).toBeDefined();
    expect(result.snapshot).toEqual(snapshot);
  });
});

// ── reprocessReservation ──────────────────────────────────────

describe("reprocessReservation", () => {
  const originalEnv = process.env.CVCRM_SYNC_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CVCRM_SYNC_ENABLED = "true";
    setupAgentAnalysisMocks();
  });

  afterEach(() => {
    process.env.CVCRM_SYNC_ENABLED = originalEnv;
  });

  it("resets status to pending before reprocessing", async () => {
    mockGetReservationById
      .mockResolvedValueOnce(
        makeReservation({
          status: "divergent",
          cvcrmSnapshot: makeSnapshot(),
        }),
      )
      .mockResolvedValueOnce(
        makeReservation({ status: "approved" }),
      );

    mockCheckDocumentCompleteness.mockReturnValue({
      complete: true,
      missingGroups: [],
      documentTypes: [],
      message: "OK",
    });
    mockAnalyzeContract.mockResolvedValue(makeAnalysis());

    await reprocessReservation("uuid-123");

    expect(mockUpdateReservationStatus).toHaveBeenCalledWith(
      "uuid-123",
      "pending",
    );
  });

  it("re-runs full agent analysis with existing snapshot", async () => {
    const snapshot = makeSnapshot();
    mockGetReservationById
      .mockResolvedValueOnce(
        makeReservation({
          status: "divergent",
          cvcrmSnapshot: snapshot,
        }),
      )
      .mockResolvedValueOnce(
        makeReservation({ status: "approved" }),
      );

    mockCheckDocumentCompleteness.mockReturnValue({
      complete: true,
      missingGroups: [],
      documentTypes: [],
      message: "OK",
    });
    mockAnalyzeContract.mockResolvedValue(makeAnalysis());

    const result = await reprocessReservation("uuid-123");

    expect(mockAnalyzeContract).toHaveBeenCalled();
    expect(result.reprocessed).toBe(true);
    expect(result.status).toBe("approved");
  });

  it("syncs with CVCRM after reprocessing", async () => {
    mockGetReservationById
      .mockResolvedValueOnce(
        makeReservation({
          status: "divergent",
          cvcrmSnapshot: makeSnapshot(),
        }),
      )
      .mockResolvedValueOnce(
        makeReservation({ status: "approved" }),
      );

    mockCheckDocumentCompleteness.mockReturnValue({
      complete: true,
      missingGroups: [],
      documentTypes: [],
      message: "OK",
    });
    mockAnalyzeContract.mockResolvedValue(
      makeAnalysis({ formattedReport: "Nenhuma divergência encontrada" }),
    );

    await reprocessReservation("uuid-123");

    expect(mockEnviarMensagem).toHaveBeenCalledWith(
      22718,
      "Nenhuma divergência encontrada",
    );
    expect(mockAlterarSituacao).toHaveBeenCalledWith(
      22718,
      38,
      "Contrato Validado",
      "Validado por IA",
    );
  });

  it("allows reprocessing from approved status", async () => {
    mockGetReservationById
      .mockResolvedValueOnce(
        makeReservation({
          status: "approved",
          cvcrmSnapshot: makeSnapshot(),
        }),
      )
      .mockResolvedValueOnce(
        makeReservation({ status: "approved" }),
      );

    mockCheckDocumentCompleteness.mockReturnValue({
      complete: true,
      missingGroups: [],
      documentTypes: [],
      message: "OK",
    });
    mockAnalyzeContract.mockResolvedValue(makeAnalysis());

    const result = await reprocessReservation("uuid-123");

    expect(result.reprocessed).toBe(true);
  });

  it("allows reprocessing from confirmed status", async () => {
    mockGetReservationById
      .mockResolvedValueOnce(
        makeReservation({
          status: "confirmed",
          cvcrmSnapshot: makeSnapshot(),
        }),
      )
      .mockResolvedValueOnce(
        makeReservation({ status: "divergent" }),
      );

    mockCheckDocumentCompleteness.mockReturnValue({
      complete: true,
      missingGroups: [],
      documentTypes: [],
      message: "OK",
    });
    mockAnalyzeContract.mockResolvedValue(
      makeAnalysis({ formattedReport: "**Erro**: divergente" }),
    );

    const result = await reprocessReservation("uuid-123");

    expect(result.reprocessed).toBe(true);
    expect(result.status).toBe("divergent");
  });
});
