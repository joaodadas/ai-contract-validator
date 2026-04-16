import { NextRequest } from "next/server";

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/db/queries", () => ({
  getReservationStatus: jest.fn(),
}));

import { GET } from "@/app/api/reservas/[id]/status/route";
import { getSession } from "@/lib/auth/session";
import { getReservationStatus } from "@/db/queries";

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetReservationStatus = getReservationStatus as jest.MockedFunction<typeof getReservationStatus>;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/reservas/uuid-1/status");
}

function makeParams(id = "uuid-1") {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/reservas/[id]/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
  });

  it("retorna 404 quando reserva não encontrada", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    mockGetReservationStatus.mockResolvedValue(undefined as never);

    const res = await GET(makeRequest(), makeParams("uuid-404"));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("não encontrada");
  });

  it("retorna dados da reserva com Cache-Control: no-store", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" } as never);
    const statusData = { id: "uuid-1", status: "approved" };
    mockGetReservationStatus.mockResolvedValue(statusData as never);

    const res = await GET(makeRequest(), makeParams("uuid-1"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(statusData);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
