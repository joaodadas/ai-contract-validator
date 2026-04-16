import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { ReprocessReservationButton } from "@/components/reprocess-reservation-button";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ReprocessReservationButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders idle state with correct label", () => {
    render(<ReprocessReservationButton reservationId="uuid-1" />);

    expect(screen.getByRole("button", { name: /reprocessar/i })).toBeInTheDocument();
  });

  it("shows loading state when clicked", async () => {
    const user = userEvent.setup();
    // Never resolve — stay in loading
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    expect(screen.getByText(/reprocessando/i)).toBeInTheDocument();
  });

  it("calls fetch and completes without error on success", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ reprocessing: true }),
    });

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reservas/uuid-1/reprocess",
        { method: "POST" },
      );
    });
  });

  it("shows friendly error when server returns non-JSON error", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("Unexpected end of JSON input")),
    });

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro no servidor/i)).toBeInTheDocument();
    });
    // Should NOT show raw technical error
    expect(screen.queryByText(/Unexpected end/i)).not.toBeInTheDocument();
  });

  it("shows friendly error on network failure (fetch throws)", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(screen.getByText(/falha na comunicação/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
  });

  it("shows server error message when JSON body is present", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: "Reserva já está em processamento" }),
    });

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(screen.getByText(/já está em processamento/i)).toBeInTheDocument();
    });
  });

  it("shows session expired message on 401", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error("no body")),
    });

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(screen.getByText(/sessão expirada/i)).toBeInTheDocument();
    });
  });

  it("allows retry after error", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("no body")),
    });

    render(<ReprocessReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao reprocessar/i)).toBeInTheDocument();
    });

    // Click "Tentar novamente" — should go back to idle
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(screen.getByRole("button", { name: /reprocessar/i })).toBeInTheDocument();
  });

  it("calls correct API endpoint with reservation ID", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ reprocessing: true }),
    });

    render(<ReprocessReservationButton reservationId="uuid-abc-123" />);

    await user.click(screen.getByRole("button", { name: /reprocessar/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/reservas/uuid-abc-123/reprocess",
      { method: "POST" },
    );
  });
});
