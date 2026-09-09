"use client";

import { useEffect, useState } from "react";
import { EmptyState, Skeleton } from "@/components/ui/Surfaces";
import { Select } from "@/components/ui/Field";
import { listWeeks } from "@/services/weeks";
import { listHistoryByWeek } from "@/services/weeklyHistory";
import { formatNumber, formatPeriodo } from "@/utils/format";
import type { Week, WeeklyHistory } from "@/types";

export default function HistoricoPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState("");
  const [rows, setRows] = useState<WeeklyHistory[] | null>(null);

  useEffect(() => {
    listWeeks().then((w) => {
      setWeeks(w);
      if (w[0]) setWeekId(w[0].id);
    });
  }, []);

  useEffect(() => {
    if (!weekId) return;
    setRows(null);
    listHistoryByWeek(weekId).then(setRows);
  }, [weekId]);

  const semana = weeks.find((w) => w.id === weekId);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Histórico semanal</h1>
      <p className="mb-6 text-sm text-ink-faint">Desempenho calculado por semana, funcionário a funcionário.</p>

      <div className="mb-5 max-w-xs">
        <Select value={weekId} onChange={(e) => setWeekId(e.target.value)}>
          {weeks.map((w) => (
            <option key={w.id} value={w.id}>
              {formatPeriodo(w.inicio, w.fim)} {w.ativa ? "(ativa)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {rows === null ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="Sem histórico para esta semana" description="Nenhuma importação foi confirmada para o período selecionado." />
      ) : (
        <div className="overflow-hidden rounded border border-base-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Nick</th>
                <th className="px-4 py-2.5 font-medium">Turnos</th>
                <th className="px-4 py-2.5 font-medium">Liberações</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => b.turnos - a.turnos)
                .map((r, i) => (
                  <tr key={r.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                    <td className="px-4 py-2.5 text-ink">{r.employeeNick}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-muted">{formatNumber(r.turnos)}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-muted">{formatNumber(r.liberacoes)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {semana && <p className="mt-3 text-xs text-ink-faint">ID da semana: {semana.id}</p>}
    </div>
  );
}
