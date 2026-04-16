import { NextRequest } from "next/server";

// Mock next/server.after() — captures callbacks
const afterCallbacks: (() => Promise<void>)[] = [];
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    after: (cb: () => Promise<void>) => {
      afterCallbacks.push(cb);
    },
  };
});

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/services/reservation.service", () => ({
  validateReprocessable: jest.fn(),
  reprocessReservation: jest.fn(),
}));

import { POST } from "@/app/api/reservas/[id]/reprocess/route";
import { getSession } from "@/lib/auth/session";
import { validateReprocessable, reprocessReservation } from "@/services/reservation.service";

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockValidateReprocessable = validateReprocessable as jest.MockedFunction<typeof validateReprocessable>;
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
    afterCallbacks.length = 0;
  });

  // ── Auth ───────────────────────────────────────────��────────

  it("retorna 401 quando não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("autorizado");
  });

  // ── Validação síncrona ───────────────────────────────���──────

  it("retorna 422 quando reserva não encontrada", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockValidateReprocessable.mockRejectedValue(
      new Error("Reserva uuid-404 não encontrada"),
    );

    const res = await POST(makeRequest(), makeParams("uuid-404"));

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("não encontrada");
  });

  it("retorna 422 quando reserva está pending", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockValidateReprocessable.mockRejectedValue(
      new Error("Reserva uuid-1 já está em processamento"),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("processamento");
  });

  it("retorna 422 quando reserva não tem snapshot", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockValidateReprocessable.mockRejectedValue(
      new Error("Reserva uuid-1 não possui snapshot do CVCRM"),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("snapshot");
  });

  // ── Sucesso (retorno imediato + background) ─────────────────

  it("retorna 200 com reprocessing:true imediatamente e agenda background", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockValidateReprocessable.mockResolvedValue({} as never);
    mockReprocessReservation.mockResolvedValue({ reprocessed: true, status: "approved" });

    const res = await POST(makeRequest(), makeParams("uuid-99"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reprocessing).toBe(true);

    // reprocessReservation runs inside after() callback
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(mockReprocessReservation).toHaveBeenCalledWith("uuid-99");
  });

  it("não falha quando reprocessReservation rejeita no background", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockValidateReprocessable.mockResolvedValue({} as never);
    mockReprocessReservation.mockRejectedValue(new Error("LLM timeout"));

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);

    // after() callback catches the error
    await expect(afterCallbacks[0]()).resolves.not.toThrow();
  });
});
