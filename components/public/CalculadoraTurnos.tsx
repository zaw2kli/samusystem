"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { Input, Label } from "@/components/ui/Field";
import { formatMinutos, formatNumber } from "@/utils/format";

export function CalculadoraTurnos({ duracaoTurnoMinutos = 10 }: { duracaoTurnoMinutos?: number }) {
  const [atual, setAtual] = useState<string>("");
  const [meta, setMeta] = useState<string>("");
  const [duracao, setDuracao] = useState<string>(String(duracaoTurnoMinutos));

  const resultado = useMemo(() => {
    const a = Number(atual);
    const m = Number(meta);
    const d = Number(duracao);
    if (!Number.isFinite(a) || !Number.isFinite(m) || !Number.isFinite(d) || d <= 0) return null;
    const diferenca = Math.max(0, m - a);
    const minutos = diferenca * d;
    return { diferenca, minutos };
  }, [atual, meta, duracao]);

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2 text-ink">
        <Calculator className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Calculadora de turnos</h3>
      </div>
      <p className="mb-4 text-xs text-ink-faint">
        Ferramenta de simulação — não altera nenhum dado registrado.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="calc-atual">Turnos atuais</Label>
          <Input id="calc-atual" type="number" min={0} value={atual} onChange={(e) => setAtual(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="calc-meta">Meta</Label>
          <Input id="calc-meta" type="number" min={0} value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="calc-duracao">Minutos por turno</Label>
          <Input id="calc-duracao" type="number" min={1} value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </div>
      </div>

      {resultado && (
        <div className="mt-4 flex flex-wrap gap-6 border-t border-base-border pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">Turnos restantes</p>
            <p className="font-mono text-lg text-ink">{formatNumber(resultado.diferenca)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">Tempo estimado</p>
            <p className="font-mono text-lg text-accent">{formatMinutos(resultado.minutos)}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
