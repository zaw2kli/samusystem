"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Surfaces";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { listWeeks, getActiveWeek } from "@/services/weeks";
import { parseXlsxFile, buildPlanilhaLinhas, analyzeImport, confirmImport, type ParsedSheet } from "@/lib/importEngine";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { formatNumber, formatPeriodo } from "@/utils/format";
import type { ImportAnalysis, ImportDiffItem, Week } from "@/types";

type Etapa = "semana" | "upload" | "mapeamento" | "previa" | "confirmando" | "concluido";

const PASSOS_PROGRESSO = [
  "Lendo dados…",
  "Comparando funcionários…",
  "Atualizando funcionários…",
  "Criando histórico…",
  "Calculando ranking…",
  "Atualizando destaques…",
  "Finalizando…",
];

export default function ImportarPage() {
  const { admin } = useAdmin();
  const { toast } = useToast();

  const [etapa, setEtapa] = useState<Etapa>("semana");
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapeamento, setMapeamento] = useState({ nick: "", turnos: "", liberacoes: "" });

  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [desativarAusentes, setDesativarAusentes] = useState(true);
  const [passoAtual, setPassoAtual] = useState(0);
  const [resultado, setResultado] = useState<{ atualizados: number; novos: number; desativados: number } | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    (async () => {
      const [lista, ativa] = await Promise.all([listWeeks(), getActiveWeek()]);
      setWeeks(lista);
      if (ativa) setWeekId(ativa.id);
    })();
  }, []);

  const semanaSelecionada = weeks.find((w) => w.id === weekId);
  const colunasFaltando = parsed
    ? !parsed.colunas.nick || !parsed.colunas.turnos || !parsed.colunas.liberacoes
    : false;

  async function handleUpload(f: File) {
    setFile(f);
    setCarregando(true);
    try {
      const result = await parseXlsxFile(f);
      setParsed(result);
      setMapeamento({
        nick: result.colunas.nick ?? "",
        turnos: result.colunas.turnos ?? "",
        liberacoes: result.colunas.liberacoes ?? "",
      });
      if (!result.colunas.nick || !result.colunas.turnos || !result.colunas.liberacoes) {
        setEtapa("mapeamento");
      } else {
        await rodarAnalise(result, {
          nick: result.colunas.nick,
          turnos: result.colunas.turnos,
          liberacoes: result.colunas.liberacoes,
        });
      }
    } catch {
      toast("Não foi possível ler o arquivo. Verifique se é um .xlsx válido.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function rodarAnalise(sheet: ParsedSheet, map: { nick: string; turnos: string; liberacoes: string }) {
    setCarregando(true);
    try {
      const { linhas, erros: errosParsing } = buildPlanilhaLinhas(sheet, map);
      const result = await analyzeImport(linhas, weekId, file?.name ?? "planilha.xlsx", sheet.colunas);
      result.erros = [...errosParsing, ...result.erros];
      result.podeConfirmar = result.erros.length === 0;
      setAnalysis(result);
      setEtapa("previa");
    } catch {
      toast("Erro ao analisar a planilha.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarItem(nick: string, patch: Partial<ImportDiffItem>) {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      itens: analysis.itens.map((i) => (i.nick === nick ? { ...i, ...patch } : i)),
    });
  }

  async function handleConfirmar() {
    if (!analysis || !admin) return;
    setEtapa("confirmando");
    setPassoAtual(0);
    const interval = setInterval(() => {
      setPassoAtual((p) => Math.min(p + 1, PASSOS_PROGRESSO.length - 1));
    }, 450);
    try {
      const res = await confirmImport({
        weekId,
        arquivoNome: file?.name ?? "planilha.xlsx",
        adminId: admin.id,
        adminNome: admin.nome,
        itens: analysis.itens,
        ausentes: analysis.ausentes,
        desativarAusentes,
      });
      clearInterval(interval);
      setResultado(res);
      setEtapa("concluido");
    } catch {
      clearInterval(interval);
      toast("Ocorreu um erro ao gravar a importação. Nenhuma alteração parcial foi mantida.", "erro");
      setEtapa("previa");
    }
  }

  function reiniciar() {
    setEtapa("semana");
    setFile(null);
    setParsed(null);
    setAnalysis(null);
    setResultado(null);
  }

  const resumo = useMemo(() => {
    if (!analysis) return null;
    const criar = analysis.itens.filter((i) => i.acao === "criar" && i.criarSeNovo).length;
    const atualizar = analysis.itens.filter((i) => i.acao === "atualizar" && !i.erro).length;
    const comErro = analysis.itens.filter((i) => !!i.erro).length + analysis.erros.length;
    return { criar, atualizar, comErro, ausentes: analysis.ausentes.length };
  }, [analysis]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold text-ink">Importar planilha</h1>
      <p className="mb-6 text-sm text-ink-faint">
        Envie o .xlsx semanal — nada é gravado no Firebase antes da sua confirmação.
      </p>

      <Etapas atual={etapa} />

      {etapa === "semana" && (
        <Card className="mt-6 max-w-md">
          <Label htmlFor="semana">Semana desta importação</Label>
          <Select id="semana" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
            <option value="">Selecione…</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {formatPeriodo(w.inicio, w.fim)} {w.ativa ? "(ativa)" : ""}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-ink-faint">
            Não encontrou a semana certa? Crie uma nova em{" "}
            <a href="/admin/semanas" className="text-accent hover:underline">
              Semanas
            </a>
            .
          </p>
          <Button className="mt-4" disabled={!weekId} onClick={() => setEtapa("upload")}>
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {etapa === "upload" && (
        <Card className="mt-6">
          <p className="mb-3 text-sm text-ink-muted">
            Semana selecionada: <span className="text-ink">{semanaSelecionada && formatPeriodo(semanaSelecionada.inicio, semanaSelecionada.fim)}</span>
          </p>
          <label
            htmlFor="arquivo"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-base-border py-14 text-center hover:border-accent/50"
          >
            {carregando ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            ) : (
              <UploadCloud className="h-6 w-6 text-ink-faint" />
            )}
            <p className="text-sm text-ink-muted">Clique para selecionar o arquivo .xlsx</p>
            <p className="text-xs text-ink-faint">Somente arquivos Excel (.xlsx)</p>
            <input
              id="arquivo"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </Card>
      )}

      {etapa === "mapeamento" && parsed && (
        <Card className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-status-warn">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">Não conseguimos identificar todas as colunas automaticamente. Selecione manualmente:</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="map-nick">Coluna do nickname</Label>
              <Select id="map-nick" value={mapeamento.nick} onChange={(e) => setMapeamento({ ...mapeamento, nick: e.target.value })}>
                <option value="">Selecione…</option>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="map-turnos">Coluna de turnos</Label>
              <Select id="map-turnos" value={mapeamento.turnos} onChange={(e) => setMapeamento({ ...mapeamento, turnos: e.target.value })}>
                <option value="">Selecione…</option>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="map-liberacoes">Coluna de liberações</Label>
              <Select
                id="map-liberacoes"
                value={mapeamento.liberacoes}
                onChange={(e) => setMapeamento({ ...mapeamento, liberacoes: e.target.value })}
              >
                <option value="">Selecione…</option>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button
            className="mt-5"
            loading={carregando}
            disabled={!mapeamento.nick || !mapeamento.turnos || !mapeamento.liberacoes}
            onClick={() => rodarAnalise(parsed, mapeamento)}
          >
            Analisar planilha <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {etapa === "previa" && analysis && resumo && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="Total de linhas" value={analysis.totalLinhas} />
            <MiniStat label="Atualizados" value={resumo.atualizar} tone="ok" />
            <MiniStat label="Novos" value={resumo.criar} tone="info" />
            <MiniStat label="Ausentes" value={resumo.ausentes} tone="warn" />
            <MiniStat label="Erros" value={resumo.comErro} tone={resumo.comErro > 0 ? "bad" : "ok"} />
          </div>

          {analysis.erros.length > 0 && (
            <Card className="border-status-bad/40">
              <div className="mb-2 flex items-center gap-2 text-status-bad">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">A importação está bloqueada até corrigir estes erros</p>
              </div>
              <ul className="space-y-1 text-xs text-ink-muted">
                {analysis.erros.map((e, i) => (
                  <li key={i}>
                    {e.linha ? `Linha ${e.linha}: ` : ""}
                    {e.nick ? `${e.nick} — ` : ""}
                    {e.mensagem}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Funcionários existentes e novos</h2>
            <div className="overflow-x-auto rounded border border-base-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                    <th className="px-3 py-2 font-medium">Nick</th>
                    <th className="px-3 py-2 font-medium">Turnos</th>
                    <th className="px-3 py-2 font-medium">Liberações</th>
                    <th className="px-3 py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.itens.map((item) => (
                    <tr key={item.nick} className={item.erro ? "bg-status-bad/5" : ""}>
                      <td className="px-3 py-2 text-ink">{item.nick}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                        {item.turnosFirebase ?? "—"} → {item.turnosPlanilha}{" "}
                        <span className={item.erro ? "text-status-bad" : "text-status-ok"}>
                          ({item.turnosSemana! >= 0 ? "+" : ""}
                          {item.turnosSemana})
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                        {item.liberacoesFirebase ?? "—"} → {item.liberacoesPlanilha}{" "}
                        <span className={item.erro ? "text-status-bad" : "text-status-ok"}>
                          ({item.liberacoesSemana! >= 0 ? "+" : ""}
                          {item.liberacoesSemana})
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {item.erro ? (
                          <Badge tone="bad">erro</Badge>
                        ) : item.acao === "criar" ? (
                          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <input
                              type="checkbox"
                              checked={!!item.criarSeNovo}
                              onChange={(e) => atualizarItem(item.nick, { criarSeNovo: e.target.checked })}
                            />
                            Criar novo funcionário
                          </label>
                        ) : (
                          <Badge tone="ok">atualizar</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {analysis.ausentes.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Funcionários ausentes da planilha</h2>
              <Card>
                <label className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={desativarAusentes}
                    onChange={(e) => setDesativarAusentes(e.target.checked)}
                  />
                  Desativar automaticamente os funcionários ausentes ao confirmar
                </label>
                <ul className="grid grid-cols-2 gap-1.5 text-xs text-ink-muted sm:grid-cols-4">
                  {analysis.ausentes.map((a) => (
                    <li key={a.nick}>{a.nick}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {analysis.duplicados.length > 0 && (
            <Card className="border-status-warn/40">
              <div className="mb-2 flex items-center gap-2 text-status-warn">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Nicknames duplicados na planilha (não importados)</p>
              </div>
              <ul className="space-y-1 text-xs text-ink-muted">
                {analysis.duplicados.map((d) => (
                  <li key={d.nick}>
                    {d.nick} — linhas {d.linhas.join(", ")}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={reiniciar}>
              Cancelar
            </Button>
            <Button disabled={!analysis.podeConfirmar} onClick={handleConfirmar}>
              Confirmar importação <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {etapa === "confirmando" && (
        <Card className="mt-6">
          <div className="space-y-2">
            {PASSOS_PROGRESSO.map((p, i) => (
              <div key={p} className={`flex items-center gap-2 text-sm ${i <= passoAtual ? "text-ink" : "text-ink-faint"}`}>
                {i < passoAtual ? (
                  <CheckCircle2 className="h-4 w-4 text-status-ok" />
                ) : i === passoAtual ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-base-border" />
                )}
                {p}
              </div>
            ))}
          </div>
        </Card>
      )}

      {etapa === "concluido" && resultado && (
        <Card className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-status-ok">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">Importação concluída com sucesso.</p>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <MiniStat label="Atualizados" value={resultado.atualizados} tone="ok" />
            <MiniStat label="Novos" value={resultado.novos} tone="info" />
            <MiniStat label="Desativados" value={resultado.desativados} tone="warn" />
          </div>
          <Button variant="secondary" onClick={reiniciar}>
            Nova importação
          </Button>
        </Card>
      )}
    </div>
  );
}

function Etapas({ atual }: { atual: Etapa }) {
  const ordem: { chave: Etapa; label: string }[] = [
    { chave: "semana", label: "Semana" },
    { chave: "upload", label: "Arquivo" },
    { chave: "previa", label: "Prévia" },
    { chave: "concluido", label: "Concluído" },
  ];
  const indiceAtual = ordem.findIndex(
    (o) => o.chave === atual || (atual === "mapeamento" && o.chave === "upload") || (atual === "confirmando" && o.chave === "previa")
  );
  return (
    <div className="flex items-center gap-2 text-xs text-ink-faint">
      {ordem.map((o, i) => (
        <div key={o.chave} className="flex items-center gap-2">
          <span className={i <= indiceAtual ? "text-accent" : ""}>{o.label}</span>
          {i < ordem.length - 1 && <span>—</span>}
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ok" | "warn" | "bad" | "info" | "neutral" }) {
  return (
    <Card>
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className={`mt-1 font-mono text-lg ${TONE_TEXT[tone]}`}>{formatNumber(value)}</p>
    </Card>
  );
}

const TONE_TEXT: Record<string, string> = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  bad: "text-status-bad",
  info: "text-status-info",
  neutral: "text-ink",
};
