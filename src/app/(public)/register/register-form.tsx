"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-border/40 bg-card/80 p-0 backdrop-blur-sm">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-sm font-bold text-primary">L</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Crie sua conta
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Preencha os campos abaixo para começar
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Seu nome"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Criando conta..." : "Criar conta"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossos{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">
          Termos de Uso
        </a>{" "}
        e{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">
          Política de Privacidade
        </a>
        .
      </p>
    </div>
  );
}
