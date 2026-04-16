import { NextRequest } from "next/server";

// Mock next/server.after() — it runs callbacks immediately in test
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

jest.mock("@/services/reservation.service", () => ({
  processarReserva: jest.fn(),
}));

import { POST } from "@/app/api/automacao_contratos/route";
import { processarReserva } from "@/services/reservation.service";

const mockProcessarReserva = processarReserva as jest.MockedFunction<typeof processarReserva>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/automacao_contratos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/automacao_contratos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid json{{{",
  });
}

describe("POST /api/automacao_contratos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    afterCallbacks.length = 0;
  });

  // ── Validação de entrada ────────────────────────────────────

  it("retorna 400 para body JSON inválido", async () => {
    const res = await POST(makeInvalidRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("inválido");
  });

  it("retorna 422 quando idreserva está ausente", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("idreserva");
  });

  it("retorna 422 quando idreserva é 0", async () => {
    const res = await POST(makeRequest({ idreserva: 0 }));
    expect(res.status).toBe(422);
  });

  // ── Modo teste (sem idtransacao) ────────────────────────────

  it("retorna 200 com mode=test quando idtransacao está ausente", async () => {
    const res = await POST(makeRequest({ idreserva: 12345 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.mode).toBe("test");
    expect(mockProcessarReserva).not.toHaveBeenCalled();
  });

  it("retorna 200 com mode=test quando idtransacao é 0", async () => {
    const res = await POST(makeRequest({ idreserva: 12345, idtransacao: 0 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe("test");
  });

  // ── Processamento real ──────────────────────────────────────

  it("retorna 200 imediatamente e agenda processamento em background", async () => {
    mockProcessarReserva.mockResolvedValue({} as never);

    const res = await POST(makeRequest({ idreserva: 22718, idtransacao: 99 }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.mode).toBeUndefined();

    // processarReserva is called inside after() callback
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(mockProcessarReserva).toHaveBeenCalledWith(22718, 99);
  });

  it("aceita campo em camelCase (idReserva/idTransacao)", async () => {
    mockProcessarReserva.mockResolvedValue({} as never);

    const res = await POST(makeRequest({ idReserva: 100, idTransacao: 50 }));
    expect(res.status).toBe(200);

    await afterCallbacks[0]();
    expect(mockProcessarReserva).toHaveBeenCalledWith(100, 50);
  });

  // ── Resiliência ─────────────────────────────────────────────

  it("não falha quando processarReserva rejeita — erro é silenciado no after()", async () => {
    mockProcessarReserva.mockRejectedValue(new Error("DB timeout"));

    const res = await POST(makeRequest({ idreserva: 22718, idtransacao: 99 }));
    expect(res.status).toBe(200);

    // The after() callback should catch and log, not throw
    await expect(afterCallbacks[0]()).resolves.not.toThrow();
  });
});
