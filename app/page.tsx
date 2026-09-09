"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCog, History } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/PublicShell";
import { SearchBar } from "@/components/public/SearchBar";
import { CalculadoraTurnos } from "@/components/public/CalculadoraTurnos";
import { DestaquesSemana } from "@/components/public/DestaquesSemana";
import { Card, Skeleton } from "@/components/ui/Surfaces";
import { listenActiveWeek } from "@/services/weeks";
import { listenHighlightsByWeek } from "@/services/highlights";
import { listenConfig, DEFAULT_CONFIG } from "@/services/config";
import { formatPeriodo } from "@/utils/format";
import type { Highlight, SystemConfig, Week } from "@/types";

export default function HomePage() {
  const [week, setWeek] = useState<Week | null | undefined>(undefined);
  const [destaques, setDestaques] = useState<Highlight[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const unsubWeek = listenActiveWeek(setWeek);
    const unsubConfig = listenConfig(setConfig);
    return () => {
      unsubWeek();
      unsubConfig();
    };
  }, []);

  useEffect(() => {
    if (!week) {
      setDestaques([]);
      return;
    }
    return listenHighlightsByWeek(week.id, setDestaques);
  }, [week]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <section className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">{config.nomeSistema}</p>
          <h1 className="mb-6 max-w-xl text-2xl font-semibold text-ink sm:text-3xl">
            Consulte a produtividade semanal da equipe.
          </h1>
          <SearchBar />
        </section>

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-accent" />
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Responsável da semana</p>
            </div>
            {week === undefined ? (
              <Skeleton className="h-6 w-32" />
            ) : week?.responsavelNick ? (
              <>
                <p className="text-lg text-ink">{week.responsavelNick}</p>
                <p className="mt-1 text-xs text-ink-faint">{formatPeriodo(week.inicio, week.fim)}</p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">Nenhum responsável definido para esta semana.</p>
            )}
          </Card>
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Semana atual</p>
            </div>
            {week === undefined ? (
              <Skeleton className="h-6 w-32" />
            ) : week ? (
              <p className="text-lg text-ink">{formatPeriodo(week.inicio, week.fim)}</p>
            ) : (
              <p className="text-sm text-ink-faint">Nenhuma semana ativa no momento.</p>
            )}
          </Card>
        </section>

        {week && destaques.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-ink">Destaques da semana</h2>
            <DestaquesSemana destaques={destaques} />
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Ferramentas</h2>
          <CalculadoraTurnos duracaoTurnoMinutos={config.duracaoTurnoMinutos} />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
