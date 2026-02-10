import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Lyx Contract
            <span className="text-primary"> Intelligence</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Plataforma inteligente de gestão e análise de contratos.
            Automatize processos, reduza riscos e tome decisões mais assertivas.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Criar conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
