import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { activateVersion } from "@/db/queries/prompt-configs";
import { isPromptKey } from "@/lib/prompt-keys";

const bodySchema = z.object({
  version: z.number().int().positive(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await activateVersion({
      key,
      version: parsed.data.version,
      activatedBy: admin.id,
    });
    return NextResponse.json({ id: row.id, version: row.version });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    if (msg.toLowerCase().includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
