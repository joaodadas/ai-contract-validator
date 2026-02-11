import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base">
      <div className="mx-auto max-w-2xl text-center space-y-8 px-4">
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-text-primary">
            <span className="text-[20px] font-bold text-text-inverted">L</span>
          </div>
          <h1 className="text-[40px] font-semibold leading-[44px] tracking-[-0.03em] text-text-primary sm:text-[56px] sm:leading-[60px]">
            Lyx Contract
            <br />
            <span className="text-text-muted">Intelligence</span>
          </h1>
          <p className="mx-auto max-w-md text-[17px] leading-[26px] text-text-secondary">
            Plataforma inteligente de gestão e análise de contratos.
            Automatize processos, reduza riscos e tome decisões mais assertivas.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 rounded-xl px-6 text-[15px]">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 rounded-xl border-border-subtle px-6 text-[15px]">
            <Link href="/register">Criar conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
