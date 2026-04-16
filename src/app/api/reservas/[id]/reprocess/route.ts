import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/auth/session";
import { reprocessReservation, validateReprocessable } from "@/services/reservation.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Validate synchronously — fail fast if reservation can't be reprocessed
  try {
    await validateReprocessable(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Process in background — same pattern as webhook
  after(async () => {
    console.log(`[reprocess] processamento em background iniciado — reserva: ${id}`);
    try {
      await reprocessReservation(id);
      console.log(`[reprocess] processamento concluído — reserva: ${id}`);
    } catch (err) {
      console.error(`[reprocess] falha no reprocessamento — reserva: ${id}`, err);
    }
  });

  return NextResponse.json({ reprocessing: true });
}
