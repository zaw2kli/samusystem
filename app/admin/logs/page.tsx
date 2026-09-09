"use client";

import { useEffect, useState } from "react";
import { EmptyState, Skeleton } from "@/components/ui/Surfaces";
import { listAdminLogs } from "@/services/logs";
import type { AdminLog } from "@/types";

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[] | null>(null);

  useEffect(() => {
    listAdminLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Logs administrativos</h1>
      <p className="mb-6 text-sm text-ink-faint">Registro de todas as ações realizadas no painel.</p>

      {logs === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="Nenhum log registrado ainda" />
      ) : (
        <div className="overflow-hidden rounded border border-base-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Ação</th>
                <th className="px-4 py-2.5 font-medium">Entidade</th>
                <th className="px-4 py-2.5 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                  <td className="px-4 py-2.5 text-ink-muted">{l.adminNome}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-accent">{l.acao}</td>
                  <td className="px-4 py-2.5 text-ink-faint">{l.entidade}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{l.detalhes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
