import { getAgentsAction } from "./actions";
import { PromptsClient } from "./client";

export const metadata = {
  title: "Gerenciador de Agentes | Lyx Intelligence",
};

export default async function PromptsPage() {
  const dynamicConfigs = await getAgentsAction();

  return <PromptsClient dynamicConfigs={dynamicConfigs} />;
}
