"use client";

import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { PageContainer } from "@/components/page-container";
import {
  SectionTitle,
  SectionDescription,
  TextLabel,
  MutedText,
} from "@/components/typography";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export default function SettingsPage() {
  return (
    <>
      <Topbar
        title="Configurações"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configurações" },
        ]}
      />

      <PageContainer className="space-y-8">
        {/* Geral */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Geral</SectionTitle>
            <SectionDescription>
              Preferências de exibição da aplicação.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="Fuso horário"
              description="Selecione o fuso horário para exibição de datas e horários."
            >
              <Select defaultValue="America/Sao_Paulo">
                <SelectTrigger className="h-8 w-[200px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Formato de data"
              description="Escolha como as datas são exibidas na aplicação."
            >
              <Select defaultValue="dd-mm-yyyy">
                <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd-mm-yyyy">DD/MM/AAAA</SelectItem>
                  <SelectItem value="mm-dd-yyyy">MM/DD/AAAA</SelectItem>
                  <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* Notificações */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Notificações</SectionTitle>
            <SectionDescription>
              Controle como você recebe alertas e notificações.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="Notificações por e-mail"
              description="Receber notificações por e-mail para eventos importantes."
            >
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow
              title="Alertas de divergência"
              description="Ser notificado imediatamente quando uma reserva apresentar status divergente."
            >
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow
              title="Resumo diário"
              description="Receber um resumo diário de todos os resultados de análise."
            >
              <Switch />
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* Configuração de IA */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Configuração de IA</SectionTitle>
            <SectionDescription>
              Configurações do motor de análise de inteligência artificial.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="Modelo de IA"
              description="Selecione o modelo de IA utilizado para análise de contratos."
            >
              <Select defaultValue="gpt-4-turbo">
                <SelectTrigger className="h-8 w-[200px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3.5">Claude 3.5 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Limite de confiança"
              description="Nível mínimo de confiança para aprovação automática."
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue="85"
                  className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                />
                <MutedText>%</MutedText>
              </div>
            </SettingRow>
            <SettingRow
              title="Repetir automaticamente em falha"
              description="Repetir análise automaticamente quando o motor de IA encontrar um erro."
            >
              <Switch defaultChecked />
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* Zona de Perigo */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle className="text-status-error">Zona de Perigo</SectionTitle>
            <SectionDescription>
              Ações irreversíveis. Proceda com cautela.
            </SectionDescription>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-status-error/20 bg-status-error-bg px-4 py-3">
            <div>
              <TextLabel className="text-status-error">Resetar todas as regras</TextLabel>
              <MutedText>Isso irá resetar todas as regras de validação para os valores padrão.</MutedText>
            </div>
            <Button variant="destructive" size="sm" className="h-8 text-[13px]">
              Resetar
            </Button>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
