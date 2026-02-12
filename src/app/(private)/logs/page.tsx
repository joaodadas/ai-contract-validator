import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { Text, MicroText, MutedText, TextLabel } from "@/components/typography";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from "lucide-react";

const logs = [
  {
    id: "LOG-001",
    timestamp: "10 Feb 2026, 14:32:10",
    reservation: "RES-2024-001",
    level: "info" as const,
    message: "AI analysis completed successfully",
    details: "Score: 94 | Processing time: 8.4s | Model: gpt-4-turbo",
  },
  {
    id: "LOG-002",
    timestamp: "10 Feb 2026, 14:32:05",
    reservation: "RES-2024-001",
    level: "warning" as const,
    message: "Penalty clause exceeds configured threshold",
    details: "Penalty rate: 2% | Threshold: 1.5% | Rule: financial_validation.penalty_clause",
  },
  {
    id: "LOG-003",
    timestamp: "09 Feb 2026, 11:15:22",
    reservation: "RES-2024-002",
    level: "info" as const,
    message: "Analysis queued for processing",
    details: "Position in queue: 3 | Estimated time: 45s",
  },
  {
    id: "LOG-004",
    timestamp: "08 Feb 2026, 09:44:18",
    reservation: "RES-2024-003",
    level: "error" as const,
    message: "Analysis found critical divergences",
    details: "Failed rules: 3 | Score: 38 | Critical: document_completeness, financial_validation",
  },
  {
    id: "LOG-005",
    timestamp: "08 Feb 2026, 09:44:02",
    reservation: "RES-2024-003",
    level: "warning" as const,
    message: "Missing required document: Addendum",
    details: "Expected: contract_addendum.pdf | Found: none | Rule: document_completeness",
  },
  {
    id: "LOG-006",
    timestamp: "07 Feb 2026, 16:20:30",
    reservation: "RES-2024-004",
    level: "info" as const,
    message: "AI analysis completed successfully",
    details: "Score: 89 | Processing time: 6.2s | Model: gpt-4-turbo",
  },
  {
    id: "LOG-007",
    timestamp: "07 Feb 2026, 10:00:15",
    reservation: "RES-2024-005",
    level: "info" as const,
    message: "Analysis queued for processing",
    details: "Position in queue: 1 | Estimated time: 30s",
  },
  {
    id: "LOG-008",
    timestamp: "06 Feb 2026, 14:55:42",
    reservation: "RES-2024-006",
    level: "info" as const,
    message: "AI analysis completed successfully",
    details: "Score: 91 | Processing time: 7.1s | Model: gpt-4-turbo",
  },
];

const levelConfig = {
  info: {
    icon: Info,
    badge: "info" as const,
    label: "Info",
  },
  warning: {
    icon: AlertTriangle,
    badge: "pending" as const,
    label: "Warning",
  },
  error: {
    icon: XCircle,
    badge: "error" as const,
    label: "Error",
  },
  success: {
    icon: CheckCircle,
    badge: "success" as const,
    label: "Success",
  },
};

export default function LogsPage() {
  return (
    <>
      <Topbar
        title="System Logs"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Logs" },
        ]}
      />

      <PageContainer>
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
            <Input
              placeholder="Search logs..."
              className="h-8 border-border-subtle bg-surface-elevated pl-8 text-[13px] placeholder:text-text-muted"
            />
          </div>
          <Select>
            <SelectTrigger className="h-8 w-[120px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log Entries */}
        <SurfaceCard elevation={1} noPadding>
          <div className="divide-y divide-border-subtle">
            {logs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;
              const isWarning = log.level === "warning";

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-subtle/30"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-0.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isWarning
                          ? "text-accent-yellow"
                          : log.level === "error"
                            ? "text-status-error"
                            : "text-text-muted"
                      }`}
                      strokeWidth={1.75}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Text
                        className={`font-medium ${
                          isWarning ? "text-accent-yellow" : ""
                        }`}
                      >
                        {log.message}
                      </Text>
                      <StatusBadge variant={config.badge} dot={false}>
                        {config.label}
                      </StatusBadge>
                    </div>
                    <div
                      className={`rounded-md px-2.5 py-1.5 font-mono text-[12px] leading-[18px] ${
                        isWarning
                          ? "bg-accent-yellow-soft text-accent-yellow"
                          : "bg-surface-inset text-text-secondary"
                      }`}
                    >
                      {log.details}
                    </div>
                    <div className="flex items-center gap-3">
                      <MicroText>{log.timestamp}</MicroText>
                      <span className="text-text-muted">·</span>
                      <MicroText className="font-mono">{log.reservation}</MicroText>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle px-6 py-3">
            <MutedText>Showing 8 log entries</MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
