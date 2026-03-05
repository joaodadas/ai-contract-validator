import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReservationStatus } from "@/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const data = await getReservationStatus(id);

  if (!data) {
    return NextResponse.json(
      { error: "Reserva não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
