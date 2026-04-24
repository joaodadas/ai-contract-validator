import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPromptByKey, createDraft } from "@/db/queries/prompt-configs";
import { isPromptKey } from "@/lib/prompt-keys";

const postBodySchema = z.object({
  content: z.string().min(1).max(50000),
  notes: z.string().max(500).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }
  const data = await getPromptByKey(key);
  return NextResponse.json(data);
}

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
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = await createDraft({
    key,
    content: parsed.data.content,
    notes: parsed.data.notes,
    createdBy: admin.id,
  });
  return NextResponse.json({ id: row.id, version: row.version });
}
