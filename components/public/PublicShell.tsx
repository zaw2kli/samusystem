import Link from "next/link";
import { Radio } from "lucide-react";
import { StatusDot } from "@/components/ui/Surfaces";

export function PublicHeader() {
  return (
    <header className="border-b border-base-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
            <Radio className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-ink">SAMU</p>
            <p className="text-[11px] text-ink-faint">Painel Operacional</p>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span className="hidden items-center gap-1.5 sm:flex">
            <StatusDot />
            Sistema em operação
          </span>
          <Link href="/admin/login" className="text-ink-muted hover:text-accent">
            Acesso administrativo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-base-border py-6">
      <div className="mx-auto max-w-5xl px-5 text-center text-xs text-ink-faint">
        Dados atualizados automaticamente a cada importação semanal.
      </div>
    </footer>
  );
}
