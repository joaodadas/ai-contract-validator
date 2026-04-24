export type Provider = "google" | "xai";

export type ModelKey =
  | "google_flash"
  | "google_pro"
  | "google_flash_25"
  | "google_flash_lite_31"
  | "xai_grok3"
  | "xai_grok3_mini"
  | "xai_grok3_mini_nr"
  | "xai_grok41_fast";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AgentName =
  | "cnh-agent"
  | "rgcpf-agent"
  | "ato-agent"
  | "quadro-resumo-agent"
  | "fluxo-agent"
  | "planta-agent"
  | "comprovante-residencia-agent"
  | "declaracao-residencia-agent"
  | "certidao-estado-civil-agent"
  | "termo-agent"
  | "carteira-trabalho-agent"
  | "comprovante-renda-agent"
  | "carta-fiador-agent"
  | "validation-agent";

export type ImagePart = {
  data: Buffer;
  mimeType: string;
};

export type FilePart = {
  data: Buffer;
  mimeType: string;
};

export type AgentInput = {
  text: string;
  images?: ImagePart[];
  files?: FilePart[];
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRunOptions = {
  provider?: Provider;
  modelKey?: ModelKey;
  temperature?: number;
  maxTokens?: number;
  promptOverride?: { content: string; version: string };
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
  pessoa?: string;
  usage?: TokenUsage;
  promptVersion?: string;
};
