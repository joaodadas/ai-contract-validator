import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listPromptConfigs } from "@/db/queries/prompt-configs";
import {
  PROMPT_KEYS,
  PROMPT_KEY_LABELS,
  CRITICAL_PROMPT_KEYS,
} from "@/lib/prompt-keys";

export async function GET() {
  await requireAdmin();
  const rows = await listPromptConfigs();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const prompts = PROMPT_KEYS.map((key) => {
    const existing = byKey.get(key);
    return {
      key,
      label: PROMPT_KEY_LABELS[key],
      critical: CRITICAL_PROMPT_KEYS.has(key),
      activeVersion: existing?.activeVersion ?? null,
      totalVersions: existing?.totalVersions ?? 0,
      lastEditedAt: existing?.lastEditedAt ?? null,
      lastEditedBy: existing?.lastEditedBy ?? null,
    };
  });

  return NextResponse.json({ prompts });
}
