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

  console.log(`[webhook] recebido — reserva: ${idreserva}, transacao: ${idtransacao}`);

  after(async () => {
    console.log(`[webhook] processamento em background iniciado — reserva: ${idreserva}`);
    try {
      await processarReserva(idreserva, idtransacao);
      console.log(`[webhook] processamento em background concluído — reserva: ${idreserva}`);
    } catch (err) {
      console.error(`[webhook] falha no processamento — reserva: ${idreserva}`, err);
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
