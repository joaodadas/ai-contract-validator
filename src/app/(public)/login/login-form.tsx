'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
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
              <h1 className="text-2xl font-bold tracking-tight">
                Bem-vindo de volta
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Entre na sua conta Lyx Intelligence
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
                <a
                  href="#"
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link
                href="/register"
                className="text-primary underline-offset-4 hover:underline"
              >
                Cadastre-se
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossos{' '}
        <a
          href="#"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Termos de Uso
        </a>{' '}
        e{' '}
        <a
          href="#"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Política de Privacidade
        </a>
        .
      </p>
    </div>
  );
}
