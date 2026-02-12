"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  ScrollText,
  Cog,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Reservations",
    href: "/reservas",
    icon: FileText,
  },
  {
    label: "Rules",
    href: "/regras",
    icon: Settings,
  },
  {
    label: "Logs",
    href: "/logs",
    icon: ScrollText,
  },
];

const bottomItems = [
  {
    label: "Settings",
    href: "/settings",
    icon: Cog,
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const renderNavItem = (item: (typeof navItems)[number]) => {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");

    const linkContent = (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
          isActive
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon
          className={cn(
            "h-[16px] w-[16px] shrink-0 transition-colors",
            isActive
              ? "text-white opacity-100"
              : "opacity-50 group-hover:opacity-70"
          )}
          strokeWidth={1.75}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo Area */}
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
            <span className="text-[10px] font-bold text-white">L</span>
          </div>
          {!collapsed && (
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
              Lyx Intelligence
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {navItems.map(renderNavItem)}
      </nav>

      {/* Bottom — Settings + Collapse */}
      <div className="space-y-0.5 px-2 pb-2">
        <div className="mb-1 h-px bg-sidebar-border" />
        {bottomItems.map(renderNavItem)}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
