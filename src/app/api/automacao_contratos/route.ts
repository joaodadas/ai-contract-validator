import { NextRequest, NextResponse, after } from "next/server";
import { processarReserva } from "@/services/reservation.service";

export async function POST(request: NextRequest) {
  let body: { idreserva?: unknown; idtransacao?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const idreserva = Number(body.idreserva);
  const idtransacao = Number(body.idtransacao);

  if (!idreserva || !idtransacao) {
    return NextResponse.json(
      { error: "idreserva e idtransacao são obrigatórios" },
      { status: 422 },
    );
  }

  // Processa em background — CRM recebe o 200 imediatamente
  after(async () => {
    try {
      await processarReserva(idreserva, idtransacao);
    } catch (err) {
      console.error("[webhook] Erro ao processar reserva:", err);
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
