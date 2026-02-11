'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Reservas',
    href: '/reservas',
    icon: FileText,
  },
  {
    label: 'Regras',
    href: '/regras',
    icon: Settings,
  },
  {
    label: 'Logs',
    href: '/logs',
    icon: ScrollText,
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border-subtle bg-sidebar transition-all duration-200 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
    >
      {/* Logo Area */}
      <div className="flex h-14 items-center border-b border-border-subtle px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          {!collapsed && (
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-text-primary">
              Lyx Intelligence
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-surface-subtle text-text-primary'
                  : 'text-text-secondary hover:bg-surface-subtle/60 hover:text-text-primary',
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-muted group-hover:text-text-secondary',
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
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border-subtle p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-secondary"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
