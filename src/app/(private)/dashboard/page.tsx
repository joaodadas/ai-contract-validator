import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { SectionTitle, Text, MutedText, MicroText } from "@/components/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, CheckCircle, Clock, ChevronRight } from "lucide-react";

const recentActivity = [
  {
    id: "RES-2024-001",
    enterprise: "Tech Solutions Ltda",
    status: "success" as const,
    statusLabel: "Approved",
    date: "10 Feb 2026, 14:32",
    score: 94,
  },
  {
    id: "RES-2024-002",
    enterprise: "Global Corp S.A.",
    status: "pending" as const,
    statusLabel: "Pending AI",
    date: "09 Feb 2026, 11:15",
    score: 0,
  },
  {
    id: "RES-2024-003",
    enterprise: "Innova Digital",
    status: "error" as const,
    statusLabel: "Divergent",
    date: "08 Feb 2026, 09:44",
    score: 38,
  },
  {
    id: "RES-2024-004",
    enterprise: "Alpha Investimentos",
    status: "success" as const,
    statusLabel: "Approved",
    date: "07 Feb 2026, 16:20",
    score: 89,
  },
  {
    id: "RES-2024-005",
    enterprise: "Beta Seguros",
    status: "pending" as const,
    statusLabel: "Pending AI",
    date: "07 Feb 2026, 10:00",
    score: 0,
  },
  {
    id: "RES-2024-006",
    enterprise: "Omega Logística",
    status: "success" as const,
    statusLabel: "Approved",
    date: "06 Feb 2026, 14:55",
    score: 91,
  },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" description="Contract validation overview" />

      <PageContainer>
        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Analyzed"
            value="1.284"
            description="All time validations"
            trend={{ value: "12%", positive: true }}
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas"
          />
          <StatCard
            title="Pending AI"
            value="47"
            description="Awaiting analysis"
            trend={{ value: "5", positive: false }}
            icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas?status=pending"
          />
          <StatCard
            title="Approved by AI"
            value="1.102"
            description="Approval rate: 85.8%"
            trend={{ value: "8%", positive: true }}
            icon={<CheckCircle className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas?status=approved"
          />
        </div>

        {/* Recent Activity Table */}
        <SurfaceCard elevation={1} noPadding>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div>
              <SectionTitle>Recent Activity</SectionTitle>
              <Text className="mt-1">Latest validation executions</Text>
            </div>
            <Link
              href="/reservas"
              className="flex items-center gap-1 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="pl-6 text-[12px] font-medium text-text-muted">
                  Reservation ID
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Enterprise
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Status
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Execution Date
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted">
                  Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((item) => (
                <TableRow
                  key={item.id}
                  className="group border-border-subtle hover:bg-surface-subtle/40"
                >
                  <TableCell className="pl-6">
                    <Link
                      href={`/reservas/${item.id}`}
                      className="text-[13px] font-medium text-text-primary hover:underline"
                    >
                      {item.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-text-primary">
                      {item.enterprise}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={item.status}>
                      {item.statusLabel}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <MicroText>{item.date}</MicroText>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {item.score > 0 ? item.score : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 pb-4">
            <MutedText>Showing 6 of 1,284 results</MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
