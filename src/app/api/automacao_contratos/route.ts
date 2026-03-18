import { NextRequest, NextResponse, after } from "next/server";
import { processarReserva } from "@/services/reservation.service";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const idreserva = Number(body.idreserva ?? body.idReserva ?? 0);
  const idtransacao = Number(body.idtransacao ?? body.idTransacao ?? 0);

  if (!idreserva) {
    return NextResponse.json(
      { error: "idreserva é obrigatório" },
      { status: 422 },
    );
  }

  console.log(
    `[webhook] recebido — reserva: ${idreserva}, transacao: ${idtransacao || "N/A"}`,
  );

  if (!idtransacao) {
    return NextResponse.json(
      {
        received: true,
        mode: "test",
        message: "Webhook recebido com sucesso. idtransacao ausente — nenhum processamento disparado.",
      },
      { status: 200 },
    );
  }

  after(async () => {
    console.log(
      `[webhook] processamento em background iniciado — reserva: ${idreserva}`,
    );
    try {
      await processarReserva(idreserva, idtransacao);
      console.log(
        `[webhook] processamento em background concluído — reserva: ${idreserva}`,
      );
    } catch (err) {
      console.error(
        `[webhook] falha no processamento — reserva: ${idreserva}`,
        err,
      );
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
