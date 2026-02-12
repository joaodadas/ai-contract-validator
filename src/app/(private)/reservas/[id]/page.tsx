"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { SectionBlock } from "@/components/section-block";
import { PageContainer } from "@/components/page-container";
import {
  PageTitle,
  Text,
  MutedText,
  MicroText,
  TextLabel,
} from "@/components/typography";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  Users,
  Brain,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

/* ---------- Mock Data ---------- */
const mockReservation = {
  id: "RES-2024-001",
  enterprise: "Tech Solutions Ltda",
  contractType: "Service Agreement",
  status: "success" as const,
  statusLabel: "Approved",
  executionDate: "10 Feb 2026, 14:32",
  score: 94,
  finance: {
    totalValue: "R$ 450.000,00",
    paymentTerms: "30/60/90 days",
    penaltyClause: "2% monthly",
    tax: "ISS 5%",
  },
  documents: [
    { name: "Contract_v3.pdf", size: "2.4 MB", status: "Validated" },
    { name: "Addendum_01.pdf", size: "340 KB", status: "Validated" },
    { name: "Financial_Report.xlsx", size: "1.1 MB", status: "Pending" },
  ],
  people: [
    { name: "Carlos Mendes", role: "CFO", signatureStatus: "Signed" },
    { name: "Ana Paula Vieira", role: "Legal Director", signatureStatus: "Signed" },
    { name: "Ricardo Santos", role: "Controller", signatureStatus: "Pending" },
  ],
  logs: [
    {
      timestamp: "14:32:01",
      message: "AI analysis started",
      level: "info",
    },
    {
      timestamp: "14:32:04",
      message: "Financial clause validation: PASS",
      level: "success",
    },
    {
      timestamp: "14:32:05",
      message: "Penalty clause exceeds threshold: 2% > 1.5% configured",
      level: "warning",
    },
    {
      timestamp: "14:32:08",
      message: "Document signature validation: PASS",
      level: "success",
    },
    {
      timestamp: "14:32:10",
      message: "Analysis completed with score 94",
      level: "info",
    },
  ],
  auditPayload: {
    analysisId: "AUD-2024-001",
    modelVersion: "gpt-4-turbo-2024-01-25",
    inputTokens: 12480,
    outputTokens: 3280,
    rules: {
      financial_validation: {
        result: "pass",
        confidence: 0.97,
        details: "All financial terms within acceptable range",
      },
      penalty_clause: {
        result: "warning",
        confidence: 0.82,
        details: "Penalty rate 2% exceeds configured threshold of 1.5%",
      },
      document_completeness: {
        result: "pass",
        confidence: 0.99,
        details: "All required documents present",
      },
    },
    metadata: {
      processingTime: "8.4s",
      region: "us-east-1",
    },
  },
};

/* ---------- JSON Viewer Component ---------- */
function JsonViewer({ data }: { data: unknown }) {
  const renderValue = (value: unknown, indent: number): React.ReactNode => {
    if (typeof value === "string") {
      const isWarning = value.toLowerCase().includes("warning");
      return (
        <span className={isWarning ? "text-accent-yellow font-medium" : "text-status-info"}>
          &quot;{value}&quot;
        </span>
      );
    }
    if (typeof value === "number")
      return <span className="text-status-success">{value}</span>;
    if (typeof value === "boolean")
      return <span className="text-status-warning">{String(value)}</span>;
    if (value === null) return <span className="text-text-muted">null</span>;
    if (Array.isArray(value)) {
      return (
        <span>
          [
          {value.map((item, i) => (
            <span key={i}>
              {"\n" + " ".repeat(indent + 2)}
              {renderValue(item, indent + 2)}
              {i < value.length - 1 && ","}
            </span>
          ))}
          {"\n" + " ".repeat(indent)}]
        </span>
      );
    }
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value);
      return (
        <span>
          {"{"}
          {entries.map(([key, val], i) => (
            <span key={key}>
              {"\n" + " ".repeat(indent + 2)}
              <span className="text-text-secondary">&quot;{key}&quot;</span>
              <span className="text-text-muted">: </span>
              {renderValue(val, indent + 2)}
              {i < entries.length - 1 && ","}
            </span>
          ))}
          {"\n" + " ".repeat(indent)}
          {"}"}
        </span>
      );
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-lg bg-surface-inset p-4">
      <pre className="font-mono text-[12px] leading-[20px] text-text-primary">
        {renderValue(data, 0)}
      </pre>
    </div>
  );
}

/* ---------- Page ---------- */
export default function ReservationDetailPage() {
  const params = useParams();
  const reservation = mockReservation;
  const [showAudit, setShowAudit] = useState(false);

  return (
    <>
      <Topbar
        title={`Reservation ${params.id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reservations", href: "/reservas" },
          { label: String(params.id) },
        ]}
      />

      <PageContainer>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <PageTitle>{reservation.enterprise}</PageTitle>
              <StatusBadge variant={reservation.status}>
                {reservation.statusLabel}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              <Text className="text-text-secondary">
                {reservation.contractType}
              </Text>
              <span className="text-text-muted">·</span>
              <MicroText>{reservation.executionDate}</MicroText>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <TextLabel>Score</TextLabel>
              <span className="text-2xl font-semibold tracking-[-0.02em] text-text-primary tabular-nums">
                {reservation.score}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-border-subtle" />

        {/* Main Card with Collapsible Sections */}
        <SurfaceCard elevation={1} className="space-y-4">
          {/* Finance */}
          <SectionBlock
            title="Finance"
            icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <TextLabel>Total Value</TextLabel>
                <Text className="mt-1 font-medium">
                  {reservation.finance.totalValue}
                </Text>
              </div>
              <div>
                <TextLabel>Payment Terms</TextLabel>
                <Text className="mt-1 font-medium">
                  {reservation.finance.paymentTerms}
                </Text>
              </div>
              <div>
                <TextLabel>Penalty Clause</TextLabel>
                <Text className="mt-1 font-medium">
                  {reservation.finance.penaltyClause}
                </Text>
              </div>
              <div>
                <TextLabel>Tax</TextLabel>
                <Text className="mt-1 font-medium">
                  {reservation.finance.tax}
                </Text>
              </div>
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Documents */}
          <SectionBlock
            title="Documents"
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            <div className="space-y-2">
              {reservation.documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between rounded-md bg-surface-base/60 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
                    <div>
                      <Text className="font-medium">{doc.name}</Text>
                      <MicroText>{doc.size}</MicroText>
                    </div>
                  </div>
                  <StatusBadge
                    variant={doc.status === "Validated" ? "success" : "pending"}
                    dot={false}
                  >
                    {doc.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* People */}
          <SectionBlock
            title="People"
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              {reservation.people.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center justify-between rounded-md bg-surface-base/60 px-3 py-2"
                >
                  <div>
                    <Text className="font-medium">{person.name}</Text>
                    <MicroText>{person.role}</MicroText>
                  </div>
                  <StatusBadge
                    variant={person.signatureStatus === "Signed" ? "success" : "pending"}
                    dot={false}
                  >
                    {person.signatureStatus}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* AI Logs */}
          <SectionBlock
            title="AI Logs"
            icon={<Brain className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            <div className="space-y-1">
              {reservation.logs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md px-2 py-1.5"
                >
                  <MicroText className="shrink-0 font-mono tabular-nums">
                    {log.timestamp}
                  </MicroText>
                  {log.level === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-accent-yellow" strokeWidth={2} />
                  ) : (
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        log.level === "success"
                          ? "bg-status-success"
                          : "bg-status-info"
                      }`}
                    />
                  )}
                  <Text
                    className={
                      log.level === "warning"
                        ? "text-accent-yellow"
                        : undefined
                    }
                  >
                    {log.message}
                  </Text>
                </div>
              ))}
            </div>
          </SectionBlock>
        </SurfaceCard>

        {/* Deep Audit Detail */}
        <SurfaceCard elevation={1}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <Text className="font-semibold">Audit Payload</Text>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[12px] font-medium text-text-muted"
              onClick={() => setShowAudit(!showAudit)}
            >
              {showAudit ? "Collapse" : "Expand"} JSON
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showAudit ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </Button>
          </div>
          {showAudit && (
            <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <JsonViewer data={reservation.auditPayload} />
            </div>
          )}
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
