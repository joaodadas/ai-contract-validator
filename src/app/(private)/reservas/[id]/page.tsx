import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import {
  PageTitle,
  SectionTitle,
  SectionDescription,
  Text,
  TextLabel,
  MutedText,
  MicroText,
} from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Download,
  FileText,
  User,
  DollarSign,
  ScrollText,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface ReservaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservaDetailPage({ params }: ReservaDetailPageProps) {
  const { id } = await params;

  return (
    <>
      <Topbar title="Detalhes da Reserva" description={id} />

      <div className="mx-auto max-w-[1120px] space-y-6 px-6 py-6">
        {/* Back + Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/reservas"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-text-muted transition-colors hover:text-text-secondary"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <div>
              <PageTitle>Tech Solutions Ltda</PageTitle>
              <div className="mt-1 flex items-center gap-3">
                <MutedText>Contrato de Serviço</MutedText>
                <StatusBadge variant="success">Aprovado</StatusBadge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border-subtle text-[13px]">
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              Exportar
            </Button>
            <Button size="sm" className="h-8 text-[13px]">
              Editar
            </Button>
          </div>
        </div>

        {/* Main Card — Elevation 1 */}
        <SurfaceCard elevation={1} className="gap-6">
          {/* Finance Section — Nested Elevation 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <SectionTitle>Financeiro</SectionTitle>
            </div>
            <SurfaceCard elevation={2}>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="space-y-1">
                  <TextLabel>Valor do Contrato</TextLabel>
                  <Text className="text-text-primary font-medium">R$ 45.000,00</Text>
                </div>
                <div className="space-y-1">
                  <TextLabel>Condição de Pagamento</TextLabel>
                  <Text className="text-text-primary font-medium">30/60/90 dias</Text>
                </div>
                <div className="space-y-1">
                  <TextLabel>Score Financeiro</TextLabel>
                  <div className="flex items-center gap-2">
                    <Text className="text-text-primary font-medium">94/100</Text>
                    <StatusBadge variant="success" dot={false}>Alto</StatusBadge>
                  </div>
                </div>
                <div className="space-y-1">
                  <TextLabel>Garantia</TextLabel>
                  <Text className="text-text-primary font-medium">Sim — Caução</Text>
                </div>
              </div>
            </SurfaceCard>
          </div>

          <Separator className="bg-border-subtle" />

          {/* Documents Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <SectionTitle>Documentos</SectionTitle>
            </div>
            <SurfaceCard elevation={2}>
              <div className="space-y-3">
                {[
                  { name: "Contrato_Principal.pdf", size: "2.4 MB", status: "success" as const, label: "Validado" },
                  { name: "Anexo_Financeiro.pdf", size: "890 KB", status: "success" as const, label: "Validado" },
                  { name: "Procuracao.pdf", size: "340 KB", status: "warning" as const, label: "Pendente" },
                  { name: "Certidao_Negativa.pdf", size: "150 KB", status: "error" as const, label: "Expirado" },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-base"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-base">
                        <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-text-primary">
                          {doc.name}
                        </span>
                        <MicroText className="block">{doc.size}</MicroText>
                      </div>
                    </div>
                    <StatusBadge variant={doc.status}>{doc.label}</StatusBadge>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <Separator className="bg-border-subtle" />

          {/* People Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <SectionTitle>Pessoas</SectionTitle>
            </div>
            <SurfaceCard elevation={2}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { role: "Responsável", name: "Ana Silva", email: "ana.silva@lyx.com.br", status: "active" },
                  { role: "Contato do Cliente", name: "Roberto Mendes", email: "roberto@techsolutions.com.br", status: "active" },
                  { role: "Revisor Jurídico", name: "Dra. Carla Mota", email: "carla.mota@lyx.com.br", status: "pending" },
                  { role: "Gerente de Conta", name: "João Costa", email: "joao.costa@lyx.com.br", status: "active" },
                ].map((person) => (
                  <div
                    key={person.email}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-base">
                      <span className="text-[11px] font-medium text-text-secondary">
                        {person.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-text-primary">
                          {person.name}
                        </span>
                      </div>
                      <MicroText className="truncate block">{person.role} · {person.email}</MicroText>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <Separator className="bg-border-subtle" />

          {/* Logs Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <SectionTitle>Histórico</SectionTitle>
            </div>
            <SurfaceCard elevation={2}>
              <div className="space-y-0">
                {[
                  {
                    icon: CheckCircle,
                    iconColor: "text-status-success",
                    action: "Contrato aprovado automaticamente",
                    actor: "Sistema",
                    time: "10 Fev 2026, 14:32",
                  },
                  {
                    icon: FileText,
                    iconColor: "text-status-info",
                    action: "Documento anexo financeiro validado",
                    actor: "Ana Silva",
                    time: "10 Fev 2026, 13:45",
                  },
                  {
                    icon: AlertTriangle,
                    iconColor: "text-status-warning",
                    action: "Certidão negativa expirada detectada",
                    actor: "Sistema",
                    time: "09 Fev 2026, 10:00",
                  },
                  {
                    icon: Clock,
                    iconColor: "text-text-muted",
                    action: "Reserva criada e enviada para análise",
                    actor: "João Costa",
                    time: "08 Fev 2026, 09:15",
                  },
                ].map((log, i, arr) => (
                  <div key={i} className="flex gap-3 py-2.5">
                    <div className="flex flex-col items-center">
                      <log.icon
                        className={`h-4 w-4 shrink-0 ${log.iconColor}`}
                        strokeWidth={1.75}
                      />
                      {i < arr.length - 1 && (
                        <div className="mt-1 h-full w-px bg-border-subtle" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <span className="text-[13px] text-text-primary">
                        {log.action}
                      </span>
                      <MicroText className="block mt-0.5">
                        {log.actor} · {log.time}
                      </MicroText>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </SurfaceCard>
      </div>
    </>
  );
}
