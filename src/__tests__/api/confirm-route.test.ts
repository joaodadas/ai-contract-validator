import { NextRequest } from "next/server";

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/services/reservation.service", () => ({
  confirmReservation: jest.fn(),
}));

import { POST } from "@/app/api/reservas/[id]/confirm/route";
import { getSession } from "@/lib/auth/session";
import { confirmReservation } from "@/services/reservation.service";

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockConfirmReservation = confirmReservation as jest.MockedFunction<typeof confirmReservation>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/reservas/uuid-1/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = "uuid-1") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/reservas/[id]/confirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────

  it("retorna 401 quando não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ idSituacao: 38, situacaoLabel: "Aprovado" }),
      makeParams(),
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("autorizado");
  });

  // ── Validação de body ───────────────────────────────────────

  it("retorna 400 para body JSON inválido", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);

    const req = new NextRequest("http://localhost:3000/api/reservas/uuid-1/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, makeParams());

    expect(res.status).toBe(400);
  });

  it("retorna 400 quando idSituacao está faltando", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);

    const res = await POST(
      makeRequest({ situacaoLabel: "Aprovado" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("obrigatórios");
  });

  it("retorna 400 quando situacaoLabel está faltando", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);

    const res = await POST(
      makeRequest({ idSituacao: 38 }),
      makeParams(),
    );

    expect(res.status).toBe(400);
  });

  // ── Sucesso ─────────────────────────────────────────────────

  it("retorna status confirmed com resultado do service", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockConfirmReservation.mockResolvedValue({ synced: true });

    const res = await POST(
      makeRequest({ idSituacao: 38, situacaoLabel: "Aprovado" }),
      makeParams("uuid-99"),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("confirmed");
    expect(data.synced).toBe(true);
    expect(mockConfirmReservation).toHaveBeenCalledWith("uuid-99", 38, "Aprovado");
  });

  // ── Erros do service ────────────────────────────────────────

  it("retorna 422 quando confirmReservation lança erro de negócio", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockConfirmReservation.mockRejectedValue(
      new Error("Reserva não pode ser confirmada"),
    );

    const res = await POST(
      makeRequest({ idSituacao: 38, situacaoLabel: "Aprovado" }),
      makeParams(),
    );

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("não pode ser confirmada");
  });
});
