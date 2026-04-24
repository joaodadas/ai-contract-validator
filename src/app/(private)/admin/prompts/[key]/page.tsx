import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/page-container";
import { getPromptByKey } from "@/db/queries/prompt-configs";
import { isPromptKey, PROMPT_KEY_LABELS, CRITICAL_PROMPT_KEYS } from "@/lib/prompt-keys";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { PromptEditor } from "./editor";

export default async function PromptEditPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isPromptKey(key)) {
    notFound();
  }

  const { versions, active } = await getPromptByKey(key);
  const activeContent = active?.content ?? PROMPT_DEFAULTS[key];
  const activeVersion = active?.version ?? 0;

  const serializedVersions = versions.map((v) => ({
    id: v.id,
    version: v.version,
    isActive: v.isActive,
    isDefault: v.isDefault,
    content: v.content,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    activatedAt: v.activatedAt ? v.activatedAt.toISOString() : null,
  }));

  return (
    <>
      <Topbar
        title={PROMPT_KEY_LABELS[key]}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Prompts", href: "/admin/prompts" },
          { label: PROMPT_KEY_LABELS[key] },
        ]}
      />
      <PageContainer>
        <PromptEditor
          promptKey={key}
          label={PROMPT_KEY_LABELS[key]}
          critical={CRITICAL_PROMPT_KEYS.has(key)}
          initialContent={activeContent}
          activeVersion={activeVersion}
          versions={serializedVersions}
        />
      </PageContainer>
    </>
  );
}
