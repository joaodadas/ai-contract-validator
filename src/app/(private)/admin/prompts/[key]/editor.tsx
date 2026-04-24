"use client";

type Props = {
  promptKey: string;
  label: string;
  critical: boolean;
  initialContent: string;
  activeVersion: number;
  versions: Array<{
    id: string;
    version: number;
    isActive: boolean;
    isDefault: boolean;
    content: string;
    notes: string | null;
    createdAt: string;
    activatedAt: string | null;
  }>;
};

export function PromptEditor(_props: Props) {
  return <div>Editor placeholder — will be implemented in Task 19.</div>;
}
