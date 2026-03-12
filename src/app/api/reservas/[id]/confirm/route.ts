import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmReservation } from "@/services/reservation.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: { idSituacao: number; situacaoLabel: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido — esperado { idSituacao, situacaoLabel }" },
      { status: 400 }
    );
  }

  if (!body.idSituacao || !body.situacaoLabel) {
    return NextResponse.json(
      { error: "idSituacao e situacaoLabel são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const result = await confirmReservation(
      id,
      body.idSituacao,
      body.situacaoLabel
    );
    return NextResponse.json({ status: "confirmed", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
