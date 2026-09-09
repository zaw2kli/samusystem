"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserX, Activity, Trophy, UploadCloud, CalendarRange } from "lucide-react";
import { Card, Skeleton } from "@/components/ui/Surfaces";
import { listEmployees } from "@/services/employees";
import { getActiveWeek } from "@/services/weeks";
import { listHighlightsByWeek } from "@/services/highlights";
import { listImportLogs } from "@/services/logs";
import { formatNumber, formatPeriodo } from "@/utils/format";
import type { Employee, Highlight, ImportLog, Week } from "@/types";

export default function AdminDashboardPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [week, setWeek] = useState<Week | null | undefined>(undefined);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [ultimaImportacao, setUltimaImportacao] = useState<ImportLog | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const [emps, activeWeek, imports] = await Promise.all([
        listEmployees(),
        getActiveWeek(),
        listImportLogs(1),
      ]);
      setEmployees(emps);
      setWeek(activeWeek);
      setUltimaImportacao(imports[0] ?? null);
      if (activeWeek) setHighlights(await listHighlightsByWeek(activeWeek.id));
    })();
  }, []);

  const ativos = employees?.filter((e) => e.status === "ativo") ?? [];
  const inativos = employees?.filter((e) => e.status === "inativo") ?? [];
  const totalTurnos = ativos.reduce((s, e) => s + e.turnosAtual, 0);
  const totalLiberacoes = ativos.reduce((s, e) => s + e.liberacoesAtual, 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Dashboard</h1>
      <p className="mb-6 text-sm text-ink-faint">Visão geral do sistema.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Funcionários ativos" value={employees ? formatNumber(ativos.length) : null} />
        <StatCard icon={UserX} label="Funcionários inativos" value={employees ? formatNumber(inativos.length) : null} tone="warn" />
        <StatCard icon={Activity} label="Total de turnos" value={employees ? formatNumber(totalTurnos) : null} />
        <StatCard icon={Activity} label="Total de liberações" value={employees ? formatNumber(totalLiberacoes) : null} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Semana atual</h2>
          </div>
          {week === undefined ? (
            <Skeleton className="h-5 w-40" />
          ) : week ? (
            <>
              <p className="text-sm text-ink">{formatPeriodo(week.inicio, week.fim)}</p>
              <p className="mt-1 text-xs text-ink-faint">
                Responsável: {week.responsavelNick ?? "não definido"}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-faint">
              Nenhuma semana ativa.{" "}
              <Link href="/admin/semanas" className="text-accent hover:underline">
                Criar semana
              </Link>
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Última importação</h2>
          </div>
          {ultimaImportacao === undefined ? (
            <Skeleton className="h-5 w-40" />
          ) : ultimaImportacao ? (
            <>
              <p className="text-sm text-ink">{ultimaImportacao.arquivoNome}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {ultimaImportacao.status} · {formatNumber(ultimaImportacao.atualizados)} atualizados ·{" "}
                {formatNumber(ultimaImportacao.novos)} novos · {formatNumber(ultimaImportacao.desativados)} desativados
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-faint">Nenhuma importação realizada ainda.</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Ranking da semana</h2>
          </div>
          {highlights.length === 0 ? (
            <p className="text-sm text-ink-faint">Sem destaques calculados para a semana atual.</p>
          ) : (
            <ul className="space-y-2">
              {highlights
                .sort((a, b) => a.posicao - b.posicao)
                .map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      {h.icone} {h.nick} — {h.categoria === "turnos" ? "Turnos" : "Liberações"} #{h.posicao}
                    </span>
                    <span className="font-mono text-ink-muted">{formatNumber(h.quantidade)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: string | null;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === "warn" ? "text-status-warn" : "text-accent"}`} />
        <p className="text-xs text-ink-faint">{label}</p>
      </div>
      {value === null ? <Skeleton className="h-6 w-16" /> : <p className="font-mono text-xl text-ink">{value}</p>}
    </Card>
  );
}
