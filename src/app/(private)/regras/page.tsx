"use client";

import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { PageContainer } from "@/components/page-container";
import {
  SectionTitle,
  SectionDescription,
  Text,
  TextLabel,
  MutedText,
} from "@/components/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 first:pt-0 last:pb-0 not-last:border-b not-last:border-border-subtle">
      <div className="flex-1 space-y-0.5">
        <TextLabel className="text-text-primary">{title}</TextLabel>
        <MutedText>{description}</MutedText>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

export default function RegrasPage() {
  return (
    <>
      <Topbar
        title="Regras"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Regras" },
        ]}
      />

      <PageContainer>
        <Tabs defaultValue="finance" className="space-y-6">
          <TabsList className="inline-flex h-9 gap-0.5 rounded-lg bg-surface-subtle p-1">
            <TabsTrigger
              value="finance"
              className="rounded-md px-3 text-[13px] font-medium data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
            >
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-md px-3 text-[13px] font-medium data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
            >
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="score"
              className="rounded-md px-3 text-[13px] font-medium data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
            >
              Score
            </TabsTrigger>
            <TabsTrigger
              value="overrides"
              className="rounded-md px-3 text-[13px] font-medium data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
            >
              Overrides Corporativos
            </TabsTrigger>
          </TabsList>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-4">
            <SurfaceCard elevation={1}>
              <div className="space-y-1">
                <SectionTitle>Regras Financeiras</SectionTitle>
                <SectionDescription>
                  Configure os critérios de validação para análises financeiras dos contratos.
                </SectionDescription>
              </div>

              <SurfaceCard elevation={2}>
                <SettingRow
                  title="Validação automática de crédito"
                  description="Executar análise de crédito automaticamente ao receber uma nova reserva."
                >
                  <Switch defaultChecked />
                </SettingRow>

                <SettingRow
                  title="Limite máximo de contrato"
                  description="Valor máximo permitido para aprovação automática (em R$)."
                >
                  <Input
                    type="number"
                    defaultValue="500000"
                    className="h-8 w-[140px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>

                <SettingRow
                  title="Score mínimo para aprovação"
                  description="Score financeiro mínimo necessário para aprovação automática."
                >
                  <Input
                    type="number"
                    defaultValue="75"
                    className="h-8 w-[80px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>

                <SettingRow
                  title="Exigir garantia"
                  description="Exigir garantia para contratos acima do limite de risco."
                >
                  <Switch defaultChecked />
                </SettingRow>

                <SettingRow
                  title="Tipo de garantia padrão"
                  description="Tipo de garantia padrão para novos contratos."
                >
                  <Select defaultValue="caution">
                    <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caution">Caução</SelectItem>
                      <SelectItem value="insurance">Seguro</SelectItem>
                      <SelectItem value="bank-guarantee">Garantia Bancária</SelectItem>
                      <SelectItem value="none">Nenhuma</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </SurfaceCard>
            </SurfaceCard>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <SurfaceCard elevation={1}>
              <div className="space-y-1">
                <SectionTitle>Regras de Documentação</SectionTitle>
                <SectionDescription>
                  Configure a validação de documentos obrigatórios e opcionais.
                </SectionDescription>
              </div>

              <SurfaceCard elevation={2}>
                <SettingRow
                  title="Contrato principal obrigatório"
                  description="Exigir upload do contrato principal assinado."
                >
                  <Switch defaultChecked />
                </SettingRow>

                <SettingRow
                  title="Certidão negativa de débitos"
                  description="Exigir certidão negativa atualizada (máximo 30 dias)."
                >
                  <Switch defaultChecked />
                </SettingRow>

                <SettingRow
                  title="Prazo de validade de documentos"
                  description="Número de dias para considerar documentos como válidos."
                >
                  <Input
                    type="number"
                    defaultValue="30"
                    className="h-8 w-[80px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>

                <SettingRow
                  title="Procuração"
                  description="Exigir procuração quando o signatário não é o representante legal."
                >
                  <Switch />
                </SettingRow>

                <SettingRow
                  title="Formato de arquivo"
                  description="Formato de arquivo aceito para documentos."
                >
                  <Select defaultValue="pdf">
                    <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">Apenas PDF</SelectItem>
                      <SelectItem value="pdf-img">PDF e Imagens</SelectItem>
                      <SelectItem value="all">Todos os formatos</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </SurfaceCard>
            </SurfaceCard>
          </TabsContent>

          {/* Score Tab */}
          <TabsContent value="score" className="space-y-4">
            <SurfaceCard elevation={1}>
              <div className="space-y-1">
                <SectionTitle>Configuração de Score</SectionTitle>
                <SectionDescription>
                  Defina os pesos e critérios para o cálculo do score de risco.
                </SectionDescription>
              </div>

              <SurfaceCard elevation={2}>
                <SettingRow
                  title="Peso — Análise Financeira"
                  description="Peso da análise financeira no cálculo do score final."
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue="40"
                      className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                    />
                    <MutedText>%</MutedText>
                  </div>
                </SettingRow>

                <SettingRow
                  title="Peso — Documentação"
                  description="Peso da completude documental no cálculo do score final."
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue="30"
                      className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                    />
                    <MutedText>%</MutedText>
                  </div>
                </SettingRow>

                <SettingRow
                  title="Peso — Histórico do Cliente"
                  description="Peso do histórico de relacionamento com o cliente."
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue="20"
                      className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                    />
                    <MutedText>%</MutedText>
                  </div>
                </SettingRow>

                <SettingRow
                  title="Peso — Compliance"
                  description="Peso dos critérios de compliance e regulatório."
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      defaultValue="10"
                      className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                    />
                    <MutedText>%</MutedText>
                  </div>
                </SettingRow>

                <SettingRow
                  title="Score mínimo — Aprovação"
                  description="Score mínimo para aprovação automática do contrato."
                >
                  <Input
                    type="number"
                    defaultValue="80"
                    className="h-8 w-[80px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>

                <SettingRow
                  title="Score mínimo — Revisão"
                  description="Score abaixo deste valor é enviado para revisão manual."
                >
                  <Input
                    type="number"
                    defaultValue="50"
                    className="h-8 w-[80px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>
              </SurfaceCard>
            </SurfaceCard>
          </TabsContent>

          {/* Enterprise Overrides Tab */}
          <TabsContent value="overrides" className="space-y-4">
            <SurfaceCard elevation={1}>
              <div className="space-y-1">
                <SectionTitle>Overrides Corporativos</SectionTitle>
                <SectionDescription>
                  Configurações avançadas que sobrescrevem as regras padrão para cenários específicos.
                </SectionDescription>
              </div>

              <SurfaceCard elevation={2}>
                <SettingRow
                  title="Modo de emergência"
                  description="Desativar validações automáticas e aprovar contratos manualmente."
                >
                  <Switch />
                </SettingRow>

                <SettingRow
                  title="Bypass de score para VIPs"
                  description="Pular validação de score para clientes marcados como VIP."
                >
                  <Switch />
                </SettingRow>

                <SettingRow
                  title="Limite de override por dia"
                  description="Número máximo de aprovações manuais permitidas por dia."
                >
                  <Input
                    type="number"
                    defaultValue="10"
                    className="h-8 w-[80px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                  />
                </SettingRow>

                <SettingRow
                  title="Nível mínimo de aprovador"
                  description="Nível hierárquico mínimo para realizar overrides."
                >
                  <Select defaultValue="manager">
                    <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Analista</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="director">Diretor</SelectItem>
                      <SelectItem value="cfo">CFO</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>

                <SettingRow
                  title="Notificação de override"
                  description="Enviar notificação aos administradores quando um override é realizado."
                >
                  <Switch defaultChecked />
                </SettingRow>
              </SurfaceCard>
            </SurfaceCard>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
