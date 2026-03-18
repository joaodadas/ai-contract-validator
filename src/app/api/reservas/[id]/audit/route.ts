import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLatestAuditForReservation } from "@/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const audit = await getLatestAuditForReservation(id);

  if (!audit) {
    return NextResponse.json(
      { error: "Nenhuma auditoria encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(audit, {
    headers: { "Cache-Control": "no-store" },
  });
}
