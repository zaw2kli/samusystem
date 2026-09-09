import type { Highlight } from "@/types";
import { formatNumber } from "@/utils/format";

export function DestaquesSemana({ destaques }: { destaques: Highlight[] }) {
  const turnos = destaques.filter((d) => d.categoria === "turnos").sort((a, b) => a.posicao - b.posicao);
  const liberacoes = destaques.filter((d) => d.categoria === "liberacoes").sort((a, b) => a.posicao - b.posicao);

  if (destaques.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded border border-base-border bg-base-800/60 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Top turnos</p>
        <ul className="space-y-2.5">
          {turnos.map((d) => (
            <li key={d.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span>{d.icone}</span>
                {d.nick}
              </span>
              <span className="font-mono text-ink-muted">{formatNumber(d.quantidade)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded border border-base-border bg-base-800/60 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Top liberações</p>
        <ul className="space-y-2.5">
          {liberacoes.map((d) => (
            <li key={d.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span>{d.icone}</span>
                {d.nick}
              </span>
              <span className="font-mono text-ink-muted">{formatNumber(d.quantidade)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
