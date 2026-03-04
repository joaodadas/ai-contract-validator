export type Provider = "google" | "anthropic";

export type ModelKey =
  | "google_flash"
  | "google_pro"
  | "anthropic_haiku"
  | "anthropic_sonnet";

export type AgentName =
  | "cnh-agent"
  | "rgcpf-agent"
  | "ato-agent"
  | "quadro-resumo-agent"
  | "fluxo-agent"
  | "planta-agent";

export type AgentInput = {
  text: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRunOptions = {
  provider?: Provider;
  modelKey?: ModelKey;
  temperature?: number;
  maxTokens?: number;
};

export type AgentResult<T> = {
  agent: AgentName;
  ok: boolean;
  data?: T;
  error?: string;
  raw?: string;
  provider?: Provider;
  model?: string;
  attempts: number;
};
