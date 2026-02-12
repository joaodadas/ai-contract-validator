import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { MutedText, MicroText } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronRight } from "lucide-react";

type ReservationStatus = "success" | "pending" | "error";

const reservations: {
  id: string;
  enterprise: string;
  status: ReservationStatus;
  statusLabel: string;
  executionDate: string;
  score: number;
}[] = [
  {
    id: "RES-2024-001",
    enterprise: "Tech Solutions Ltda",
    status: "success",
    statusLabel: "Approved",
    executionDate: "10 Feb 2026, 14:32",
    score: 94,
  },
  {
    id: "RES-2024-002",
    enterprise: "Global Corp S.A.",
    status: "pending",
    statusLabel: "Pending AI",
    executionDate: "09 Feb 2026, 11:15",
    score: 0,
  },
  {
    id: "RES-2024-003",
    enterprise: "Innova Digital",
    status: "error",
    statusLabel: "Divergent",
    executionDate: "08 Feb 2026, 09:44",
    score: 38,
  },
  {
    id: "RES-2024-004",
    enterprise: "Alpha Investimentos",
    status: "success",
    statusLabel: "Approved",
    executionDate: "07 Feb 2026, 16:20",
    score: 89,
  },
  {
    id: "RES-2024-005",
    enterprise: "Beta Seguros",
    status: "pending",
    statusLabel: "Pending AI",
    executionDate: "07 Feb 2026, 10:00",
    score: 0,
  },
  {
    id: "RES-2024-006",
    enterprise: "Omega Logística",
    status: "success",
    statusLabel: "Approved",
    executionDate: "06 Feb 2026, 14:55",
    score: 91,
  },
  {
    id: "RES-2024-007",
    enterprise: "Delta Consultoria",
    status: "success",
    statusLabel: "Approved",
    executionDate: "05 Feb 2026, 08:30",
    score: 87,
  },
  {
    id: "RES-2024-008",
    enterprise: "Sigma Tecnologia",
    status: "error",
    statusLabel: "Divergent",
    executionDate: "04 Feb 2026, 17:12",
    score: 42,
  },
  {
    id: "RES-2024-009",
    enterprise: "Lambda Pharma",
    status: "pending",
    statusLabel: "Pending AI",
    executionDate: "04 Feb 2026, 09:00",
    score: 0,
  },
  {
    id: "RES-2024-010",
    enterprise: "Kappa Mining",
    status: "success",
    statusLabel: "Approved",
    executionDate: "03 Feb 2026, 15:45",
    score: 96,
  },
];

export default function ReservasPage() {
  return (
    <>
      <Topbar
        title="Reservation History"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reservations" },
        ]}
      />

      <PageContainer>
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
            <Input
              placeholder="Search reservations..."
              className="h-8 border-border-subtle bg-surface-elevated pl-8 text-[13px] placeholder:text-text-muted"
            />
          </div>
          <Select>
            <SelectTrigger className="h-8 w-[130px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending AI</SelectItem>
              <SelectItem value="divergent">Divergent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <SurfaceCard elevation={1} noPadding>
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
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Score
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((item) => (
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
                    <MicroText>{item.executionDate}</MicroText>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {item.score > 0 ? item.score : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/reservas/${item.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary"
                    >
                      Details
                      <ChevronRight className="h-3 w-3" strokeWidth={2} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
            <MutedText>Showing 10 of 1,284 results</MutedText>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 border-border-subtle text-[12px]">
                Previous
              </Button>
              <Button variant="outline" size="sm" className="h-7 border-border-subtle text-[12px]">
                Next
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
