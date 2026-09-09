"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, ChevronLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/PublicShell";
import { Card, EmptyState, Skeleton, Badge } from "@/components/ui/Surfaces";
import { findEmployeeByNick } from "@/services/employees";
import { listHistoryByEmployee } from "@/services/weeklyHistory";
import { getActiveWeek } from "@/services/weeks";
import { listHighlightsByWeek } from "@/services/highlights";
import { formatDate, formatNumber, pct } from "@/utils/format";
import type { Employee, Highlight, WeeklyHistory } from "@/types";

export default function FuncionarioPage() {
  const params = useParams<{ nick: string }>();
  const nick = decodeURIComponent(params.nick ?? "");

  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<WeeklyHistory[]>([]);
  const [destaques, setDestaques] = useState<Highlight[]>([]);
  const [semanaAtualLabel, setSemanaAtualLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const emp = await findEmployeeByNick(nick);
      if (cancelled) return;
      if (!emp) {
        setStatus("not-found");
        return;
      }
      setEmployee(emp);
      setStatus("found");

      const [hist, activeWeek] = await Promise.all([listHistoryByEmployee(emp.id), getActiveWeek()]);
      if (cancelled) return;
      setHistory(hist);

      if (activeWeek) {
        setSemanaAtualLabel(`${formatDate(activeWeek.inicio)} – ${formatDate(activeWeek.fim)}`);
        const hl = await listHighlightsByWeek(activeWeek.id);
        if (!cancelled) setDestaques(hl.filter((h) => h.employeeId === emp.id));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [nick]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent">
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar à pesquisa
        </Link>

        {status === "loading" && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {status === "not-found" && (
          <EmptyState
            title="Funcionário não encontrado"
            description="Verifique se o nickname foi digitado corretamente, ou se este funcionário está ativo."
          />
        )}

        {status === "found" && employee && (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-ink">{employee.nick}</h1>
                  <Badge tone="ok">
                    <BadgeCheck className="h-3 w-3" /> Ativo
                  </Badge>
                </div>
                <p className="text-sm text-ink-muted">{employee.cargo}</p>
              </div>
              {destaques.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {destaques.map((d) => (
                    <Badge key={d.id} tone="info">
                      <Trophy className="h-3 w-3" /> {d.icone} {d.categoria === "turnos" ? "Turnos" : "Liberações"} #{d.posicao}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoStat label="Contratação" value={formatDate(employee.contratacao)} />
              <InfoStat label="Admissão" value={formatDate(employee.admissao)} />
              <InfoStat label="Turnos totais" value={formatNumber(employee.turnosAtual)} />
              <InfoStat label="Liberações totais" value={formatNumber(employee.liberacoesAtual)} />
            </div>

            <Card className="mb-6">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
                {semanaAtualLabel ? `Progresso — semana atual (${semanaAtualLabel})` : "Progresso"}
              </p>
              <ProgressRow label="Meta de turnos" atual={employee.turnosAtual} meta={employee.metaTurnos} />
              <ProgressRow label="Meta de liberações" atual={employee.liberacoesAtual} meta={employee.metaLiberacoes} />
            </Card>

            {employee.observacao && (
              <Card className="mb-6">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">Observação</p>
                <p className="text-sm text-ink-muted">{employee.observacao}</p>
              </Card>
            )}

            <div>
              <h2 className="mb-3 text-sm font-semibold text-ink">Histórico semanal</h2>
              {history.length === 0 ? (
                <EmptyState title="Ainda sem histórico" description="Nenhuma semana foi registrada para este funcionário." />
              ) : (
                <div className="overflow-hidden rounded border border-base-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                        <th className="px-4 py-2.5 font-medium">Semana</th>
                        <th className="px-4 py-2.5 font-medium">Turnos</th>
                        <th className="px-4 py-2.5 font-medium">Liberações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                          <td className="px-4 py-2.5 text-ink-muted">{h.weekId}</td>
                          <td className="px-4 py-2.5 font-mono text-ink">{formatNumber(h.turnos)}</td>
                          <td className="px-4 py-2.5 font-mono text-ink">{formatNumber(h.liberacoes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-base-border bg-base-800/60 p-3">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-ink">{value}</p>
    </div>
  );
}

function ProgressRow({ label, atual, meta }: { label: string; atual: number; meta: number }) {
  const percentual = pct(atual, meta);
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink-faint">
          {formatNumber(atual)} / {meta > 0 ? formatNumber(meta) : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-700">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percentual}%` }} />
      </div>
    </div>
  );
}
