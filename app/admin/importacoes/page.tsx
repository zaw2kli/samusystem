"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState, Skeleton } from "@/components/ui/Surfaces";
import { listImportLogs } from "@/services/logs";
import { formatNumber } from "@/utils/format";
import type { ImportLog, ImportStatus } from "@/types";

const TONE: Record<ImportStatus, "ok" | "bad" | "warn" | "info"> = {
  confirmado: "ok",
  erro: "bad",
  cancelado: "warn",
  analisando: "info",
};

export default function ImportacoesPage() {
  const [logs, setLogs] = useState<ImportLog[] | null>(null);

  useEffect(() => {
    listImportLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Importações</h1>
      <p className="mb-6 text-sm text-ink-faint">Histórico de todas as importações de planilha realizadas.</p>

      {logs === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="Nenhuma importação registrada" description="Envie uma planilha em Importar planilha." />
      ) : (
        <div className="overflow-x-auto rounded border border-base-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Arquivo</th>
                <th className="px-4 py-2.5 font-medium">Administrador</th>
                <th className="px-4 py-2.5 font-medium">Semana</th>
                <th className="px-4 py-2.5 font-medium">Atualizados</th>
                <th className="px-4 py-2.5 font-medium">Novos</th>
                <th className="px-4 py-2.5 font-medium">Desativados</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                  <td className="px-4 py-2.5 text-ink">{l.arquivoNome}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{l.adminNome}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-faint">{l.weekId}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-muted">{formatNumber(l.atualizados)}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-muted">{formatNumber(l.novos)}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-muted">{formatNumber(l.desativados)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={TONE[l.status]}>{l.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
