import { NextRequest } from "next/server";

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/services/reservation.service", () => ({
  reprocessReservation: jest.fn(),
}));

import { POST } from "@/app/api/reservas/[id]/reprocess/route";
import { getSession } from "@/lib/auth/session";
import { reprocessReservation } from "@/services/reservation.service";

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockReprocessReservation = reprocessReservation as jest.MockedFunction<typeof reprocessReservation>;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/reservas/uuid-1/reprocess", {
    method: "POST",
  });
}

function makeParams(id = "uuid-1") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/reservas/[id]/reprocess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────────

  it("retorna 401 quando não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("autorizado");
  });

  // ── Sucesso ─────────────────────────────────────────────────

  it("retorna resultado do reprocessamento quando autenticado", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockReprocessReservation.mockResolvedValue({
      reprocessed: true,
      status: "approved",
    });

    const res = await POST(makeRequest(), makeParams("uuid-99"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reprocessed).toBe(true);
    expect(data.status).toBe("approved");
    expect(mockReprocessReservation).toHaveBeenCalledWith("uuid-99");
  });

  // ── Erros do service ────────────────────────────────────────

  it("retorna 422 quando reserva não encontrada", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockReprocessReservation.mockRejectedValue(
      new Error("Reserva uuid-404 não encontrada"),
    );

    const res = await POST(makeRequest(), makeParams("uuid-404"));

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("não encontrada");
  });

  it("retorna 422 quando reserva está pending", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockReprocessReservation.mockRejectedValue(
      new Error("Reserva uuid-1 já está em processamento"),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("processamento");
  });

  it("retorna 422 quando reserva não tem snapshot", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockReprocessReservation.mockRejectedValue(
      new Error("Reserva uuid-1 não possui snapshot do CVCRM"),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("snapshot");
  });

  it("retorna 422 quando reprocessamento falha por erro genérico", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockReprocessReservation.mockRejectedValue(new Error("LLM timeout"));

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("LLM timeout");
  });
});
