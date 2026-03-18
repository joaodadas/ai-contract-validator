import type { ValidationOutput } from "@/ai/agents/validation-agent/schema";

function formatarData(texto: string): string {
  return texto.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3-$2-$1");
}

function formatKey(key: string): string {
  let formatted = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  formatted = formatted.replace(/ Da\b/g, " da").replace(/ De\b/g, " de");
  return formatted;
}

type StatusEntry = {
  status: string;
  detalhes: string;
};

function collectDivergentItems(
  obj: Record<string, unknown>,
  items: { key: string; status: string; detalhes: string }[]
): void {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const current = obj[key] as Record<string, unknown>;

    if (current && typeof current === "object") {
      if ("status" in current && typeof current.status === "string") {
        const entry = current as unknown as StatusEntry;
        if (
          entry.status !== "Igual" &&
          entry.status !== "Ignorado"
        ) {
          items.push({
            key,
            status: entry.status,
            detalhes: entry.detalhes,
          });
        }
      } else {
        collectDivergentItems(current, items);
      }
    }
  }
}

export function formatValidationReport(
  validation: ValidationOutput
): string {
  const items: { key: string; status: string; detalhes: string }[] = [];
  collectDivergentItems(
    validation as unknown as Record<string, unknown>,
    items
  );

  if (items.length === 0) {
    return "Nenhuma divergência encontrada";
  }

  const parts: string[] = [];

  for (const item of items) {
    const formattedKey = formatKey(item.key);
    const formattedStatus = formatarData(item.status);
    let line = `**${formattedKey}**: ${formattedStatus}`;
    if (item.detalhes) {
      const formattedDetails = formatarData(item.detalhes);
      line += `\n- Detalhes: ${formattedDetails}`;
    }
    parts.push(line);
  }

  return parts.join("\n\n");
}
