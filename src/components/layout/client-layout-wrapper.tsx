'use client';

import { useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export function ClientLayoutWrapper({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enquanto não estiver montado no cliente, renderizamos apenas o children (ou um esqueleto)
  // para evitar que o HTML do servidor tente adivinhar o estado do SidebarProvider.
  if (!mounted) {
    return <div className="flex min-h-svh w-full">{children}</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      {children}
    </SidebarProvider>
  );
}
