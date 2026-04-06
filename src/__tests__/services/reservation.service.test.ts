import { confirmReservation } from "@/services/reservation.service";
import { getReservationById } from "@/db/queries";
import { alterarSituacao } from "@/lib/cvcrm/client";

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

const mockGetReservationById = getReservationById as jest.MockedFunction<
  typeof getReservationById
>;
const mockAlterarSituacao = alterarSituacao as jest.MockedFunction<
  typeof alterarSituacao
>;

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
