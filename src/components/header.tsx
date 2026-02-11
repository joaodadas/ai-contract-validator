"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/app/(private)/actions";
import type { User } from "@/db/schema";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Lyx Contract Intelligence</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.name || user.email}
          </span>
          <Separator orientation="vertical" className="h-6" />
          <form action={handleLogout}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
