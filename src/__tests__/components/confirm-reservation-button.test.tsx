import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { ConfirmReservationButton } from "@/components/confirm-reservation-button";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("ConfirmReservationButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders 'Confirmar e Aprovar' for non-override", () => {
    render(<ConfirmReservationButton reservationId="uuid-1" />);

    expect(screen.getByRole("button", { name: /confirmar e aprovar/i })).toBeInTheDocument();
  });

  it("renders 'Aprovar Manualmente' for override", () => {
    render(<ConfirmReservationButton reservationId="uuid-1" isOverride />);

    expect(screen.getByRole("button", { name: /aprovar manualmente/i })).toBeInTheDocument();
  });

  it("shows confirmation step before sending", async () => {
    const user = userEvent.setup();
    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));

    // Should show confirmation dialog, not send yet
    expect(screen.getByText(/confirmar aprovação/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar$/i })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("can cancel confirmation", async () => {
    const user = userEvent.setup();
    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    // Back to idle
    expect(screen.getByRole("button", { name: /confirmar e aprovar/i })).toBeInTheDocument();
  });

  it("shows success state after confirmation", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: "confirmed", synced: true }),
    });

    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/reserva confirmada/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/sincronizada/i)).toBeInTheDocument();
  });

  it("shows friendly error on non-JSON response", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("Unexpected end of JSON input")),
    });

    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro no servidor/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Unexpected end/i)).not.toBeInTheDocument();
  });

  it("shows friendly error on network failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/falha na comunicação/i)).toBeInTheDocument();
    });
  });

  it("shows override warning for divergent reservations", async () => {
    const user = userEvent.setup();
    render(<ConfirmReservationButton reservationId="uuid-1" isOverride />);

    await user.click(screen.getByRole("button", { name: /aprovar manualmente/i }));

    expect(screen.getByText(/aprovar manualmente mesmo com divergências/i)).toBeInTheDocument();
  });

  it("allows retry after error", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: "Reserva não pode ser confirmada" }),
    });

    render(<ConfirmReservationButton reservationId="uuid-1" />);

    await user.click(screen.getByRole("button", { name: /confirmar e aprovar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/não pode ser confirmada/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(screen.getByRole("button", { name: /confirmar e aprovar/i })).toBeInTheDocument();
  });
});
