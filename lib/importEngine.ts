import * as XLSX from "xlsx";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeNick } from "@/utils/normalize";
import { historyDocId, historyDocRef } from "@/services/weeklyHistory";
import { createImportLog, updateImportLog, createAdminLog } from "@/services/logs";
import { getConfig } from "@/services/config";
import type {
  Employee,
  ImportAnalysis,
  ImportConfirmResult,
  ImportDiffItem,
  ImportError,
  PlanilhaLinha,
} from "@/types";

// ---------- 1. Leitura e detecção de colunas ----------

const NICK_HEADERS = ["nick", "nickname", "usuario", "usuário", "jogador", "personagem"];
const TURNOS_HEADERS = ["turnos", "turno", "totalturnos", "totaldeturnos", "qtdturnos"];
const LIBERACOES_HEADERS = [
  "liberacoes",
  "liberação",
  "liberações",
  "liberacao",
  "totaldeliberacoes",
  "totalliberacoes",
  "qtdliberacoes",
];

function slugHeader(h: string): string {
  return normalizeNick(String(h)).replace(/[^a-z0-9]/g, "");
}

function detectColumn(headers: string[], candidates: string[]): string | null {
  const slugged = headers.map((h) => ({ original: h, slug: slugHeader(h) }));
  for (const cand of candidates) {
    const hit = slugged.find((h) => h.slug === cand.replace(/[^a-z0-9]/g, ""));
    if (hit) return hit.original;
  }
  // fallback: contém
  for (const cand of candidates) {
    const hit = slugged.find((h) => h.slug.includes(cand.replace(/[^a-z0-9]/g, "")));
    if (hit) return hit.original;
  }
  return null;
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
  colunas: { nick: string | null; turnos: string | null; liberacoes: string | null };
}

export async function parseXlsxFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const colunas = {
    nick: detectColumn(headers, NICK_HEADERS),
    turnos: detectColumn(headers, TURNOS_HEADERS),
    liberacoes: detectColumn(headers, LIBERACOES_HEADERS),
  };

  return { headers, rows, colunas };
}

function toNumber(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Converte as linhas cruas da planilha em PlanilhaLinha[], usando um
 * mapeamento de colunas (automático ou definido manualmente pelo admin).
 */
export function buildPlanilhaLinhas(
  parsed: ParsedSheet,
  mapeamento: { nick: string; turnos: string; liberacoes: string }
): { linhas: PlanilhaLinha[]; erros: ImportError[] } {
  const linhas: PlanilhaLinha[] = [];
  const erros: ImportError[] = [];

  parsed.rows.forEach((row, idx) => {
    const linha = idx + 2; // +2 = cabeçalho ocupa a linha 1
    const nickRaw = String(row[mapeamento.nick] ?? "").trim();
    const turnos = toNumber(row[mapeamento.turnos]);
    const liberacoes = toNumber(row[mapeamento.liberacoes]);

    if (!nickRaw) {
      erros.push({ linha, mensagem: "Nickname vazio." });
      return;
    }
    if (turnos === null || turnos < 0) {
      erros.push({ linha, nick: nickRaw, mensagem: "Valor de turnos inválido ou negativo." });
      return;
    }
    if (liberacoes === null || liberacoes < 0) {
      erros.push({ linha, nick: nickRaw, mensagem: "Valor de liberações inválido ou negativo." });
      return;
    }

    linhas.push({ linha, nick: nickRaw, turnos, liberacoes });
  });

  return { linhas, erros };
}

// ---------- 2. Análise (não grava nada no Firebase) ----------

export async function analyzeImport(
  linhas: PlanilhaLinha[],
  weekId: string,
  arquivoNome: string,
  colunasDetectadas: ParsedSheet["colunas"]
): Promise<ImportAnalysis> {
  const erros: ImportError[] = [];

  // 2.1 duplicados na planilha
  const porNick = new Map<string, number[]>();
  linhas.forEach((l) => {
    const key = normalizeNick(l.nick);
    porNick.set(key, [...(porNick.get(key) ?? []), l.linha]);
  });
  const duplicados = Array.from(porNick.entries())
    .filter(([, ls]) => ls.length > 1)
    .map(([nick, ls]) => ({ nick, linhas: ls }));

  duplicados.forEach((d) => {
    erros.push({ nick: d.nick, mensagem: `Nickname duplicado na planilha (linhas ${d.linhas.join(", ")}).` });
  });

  // 2.2 busca todos os funcionários do Firebase
  const empSnap = await getDocs(collection(db, "employees"));
  const employees = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Employee);
  const byNormalized = new Map(employees.map((e) => [e.nickNormalized, e]));

  const itens: ImportDiffItem[] = [];
  const vistos = new Set<string>();

  for (const linha of linhas) {
    const norm = normalizeNick(linha.nick);
    if (porNick.get(norm)!.length > 1) continue; // duplicados ficam de fora até corrigir a planilha
    vistos.add(norm);

    const existente = byNormalized.get(norm);

    if (!existente) {
      itens.push({
        linha: linha.linha,
        nick: linha.nick,
        employeeId: null,
        acao: "criar",
        turnosFirebase: null,
        turnosPlanilha: linha.turnos,
        turnosSemana: linha.turnos,
        liberacoesFirebase: null,
        liberacoesPlanilha: linha.liberacoes,
        liberacoesSemana: linha.liberacoes,
        criarSeNovo: true,
      });
      continue;
    }

    const turnosSemana = linha.turnos - existente.turnosAtual;
    const liberacoesSemana = linha.liberacoes - existente.liberacoesAtual;

    const item: ImportDiffItem = {
      linha: linha.linha,
      nick: existente.nick,
      employeeId: existente.id,
      acao: "atualizar",
      turnosFirebase: existente.turnosAtual,
      turnosPlanilha: linha.turnos,
      turnosSemana,
      liberacoesFirebase: existente.liberacoesAtual,
      liberacoesPlanilha: linha.liberacoes,
      liberacoesSemana,
    };

    if (turnosSemana < 0 || liberacoesSemana < 0) {
      item.erro = "O valor da planilha é menor que o valor atual registrado no Firebase.";
      erros.push({ linha: linha.linha, nick: existente.nick, mensagem: item.erro });
    }

    itens.push(item);
  }

  // 2.3 ausentes: ativos no Firebase que não vieram na planilha
  const ausentes: ImportDiffItem[] = employees
    .filter((e) => e.status === "ativo" && !vistos.has(e.nickNormalized))
    .map((e) => ({
      nick: e.nick,
      employeeId: e.id,
      acao: "desativar",
      turnosFirebase: e.turnosAtual,
      turnosPlanilha: null,
      turnosSemana: null,
      liberacoesFirebase: e.liberacoesAtual,
      liberacoesPlanilha: null,
      liberacoesSemana: null,
    }));

  const podeConfirmar = erros.length === 0;

  return {
    weekId,
    arquivoNome,
    totalLinhas: linhas.length,
    colunasDetectadas,
    itens,
    ausentes,
    duplicados,
    erros,
    podeConfirmar,
  };
}

// ---------- 3. Confirmação (grava tudo no Firebase em lote) ----------

export interface ConfirmOptions {
  weekId: string;
  arquivoNome: string;
  adminId: string;
  adminNome: string;
  itens: ImportDiffItem[]; // com criarSeNovo já decidido pelo admin
  ausentes: ImportDiffItem[];
  desativarAusentes: boolean;
}

export async function confirmImport(opts: ConfirmOptions): Promise<ImportConfirmResult> {
  const importId = await createImportLog({
    arquivoNome: opts.arquivoNome,
    weekId: opts.weekId,
    adminId: opts.adminId,
    adminNome: opts.adminNome,
  });

  try {
    const config = await getConfig();
    const batch = writeBatch(db);

    let atualizados = 0;
    let novos = 0;
    let desativados = 0;

    // valores calculados por funcionário nesta semana, para ranking/destaques
    const desempenho: { employeeId: string; nick: string; turnos: number; liberacoes: number }[] = [];

    for (const item of opts.itens) {
      if (item.erro) continue;

      if (item.acao === "criar") {
        if (!item.criarSeNovo) continue; // admin escolheu ignorar
        const newRef = doc(collection(db, "employees"));
        batch.set(newRef, {
          nick: item.nick,
          nickNormalized: normalizeNick(item.nick),
          cargo: "Não definido",
          contratacao: null,
          admissao: null,
          status: "ativo",
          metaTurnos: config.metaTurnosPadrao,
          metaLiberacoes: config.metaLiberacoesPadrao,
          turnosAtual: item.turnosPlanilha ?? 0,
          liberacoesAtual: item.liberacoesPlanilha ?? 0,
          observacao: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const histRef = historyDocRef(newRef.id, opts.weekId);
        batch.set(histRef, {
          employeeId: newRef.id,
          employeeNick: item.nick,
          weekId: opts.weekId,
          turnos: item.turnosSemana ?? 0,
          liberacoes: item.liberacoesSemana ?? 0,
          metaTurnos: config.metaTurnosPadrao,
          metaLiberacoes: config.metaLiberacoesPadrao,
          status: "ativo",
          observacao: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        novos += 1;
        desempenho.push({
          employeeId: newRef.id,
          nick: item.nick,
          turnos: item.turnosSemana ?? 0,
          liberacoes: item.liberacoesSemana ?? 0,
        });
        continue;
      }

      if (item.acao === "atualizar" && item.employeeId) {
        const empRef = doc(db, "employees", item.employeeId);
        batch.update(empRef, {
          turnosAtual: item.turnosPlanilha,
          liberacoesAtual: item.liberacoesPlanilha,
          updatedAt: serverTimestamp(),
        });

        const histRef = historyDocRef(item.employeeId, opts.weekId);
        batch.set(
          histRef,
          {
            employeeId: item.employeeId,
            employeeNick: item.nick,
            weekId: opts.weekId,
            turnos: item.turnosSemana ?? 0,
            liberacoes: item.liberacoesSemana ?? 0,
            status: "ativo",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        atualizados += 1;
        desempenho.push({
          employeeId: item.employeeId,
          nick: item.nick,
          turnos: item.turnosSemana ?? 0,
          liberacoes: item.liberacoesSemana ?? 0,
        });
      }
    }

    if (opts.desativarAusentes) {
      for (const a of opts.ausentes) {
        if (!a.employeeId) continue;
        batch.update(doc(db, "employees", a.employeeId), {
          status: "inativo",
          updatedAt: serverTimestamp(),
        });
        desativados += 1;
      }
    }

    await batch.commit();

    // ---- ranking e destaques automáticos (após o commit principal) ----
    await recalcularDestaquesSemanais(opts.weekId, desempenho, config);

    await updateImportLog(importId, {
      totalLinhas: opts.itens.length,
      atualizados,
      novos,
      desativados,
      erros: 0,
      status: "confirmado",
    });

    await createAdminLog({
      adminId: opts.adminId,
      adminNome: opts.adminNome,
      acao: "importacao_confirmada",
      entidade: "imports",
      entidadeId: importId,
      detalhes: `Arquivo "${opts.arquivoNome}" — ${atualizados} atualizados, ${novos} novos, ${desativados} desativados.`,
    });

    return { atualizados, novos, desativados, erros: 0, importId };
  } catch (err) {
    await updateImportLog(importId, { status: "erro" });
    throw err;
  }
}

async function recalcularDestaquesSemanais(
  weekId: string,
  desempenho: { employeeId: string; nick: string; turnos: number; liberacoes: number }[],
  config: Awaited<ReturnType<typeof getConfig>>
): Promise<void> {
  const { replaceAutomaticWeeklyHighlights } = await import("@/services/highlights");

  function ranking(
    campo: "turnos" | "liberacoes",
    desempatePor: "turnos" | "liberacoes"
  ) {
    return [...desempenho].sort((a, b) => {
      if (b[campo] !== a[campo]) return b[campo] - a[campo];
      return b[desempatePor] - a[desempatePor];
    });
  }

  const rankingTurnos = ranking("turnos", config.criterioDesempateSecundario === "turnos" ? "liberacoes" : "liberacoes");
  const rankingLiberacoes = ranking("liberacoes", "turnos");

  const iconePorPosicao = (p: number) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "🏅");

  const turnosDestaques = rankingTurnos
    .slice(0, config.posicoesDestaqueTurnos)
    .map((r, i) => ({
      weekId,
      tipo: "semanal" as const,
      categoria: "turnos" as const,
      posicao: i + 1,
      employeeId: r.employeeId,
      nick: r.nick,
      quantidade: r.turnos,
      premio: "",
      icone: iconePorPosicao(i + 1),
      automatico: true,
    }));

  const liberacoesDestaques = rankingLiberacoes
    .slice(0, config.posicoesDestaqueLiberacoes)
    .map((r, i) => ({
      weekId,
      tipo: "semanal" as const,
      categoria: "liberacoes" as const,
      posicao: i + 1,
      employeeId: r.employeeId,
      nick: r.nick,
      quantidade: r.liberacoes,
      premio: "",
      icone: iconePorPosicao(i + 1),
      automatico: true,
    }));

  await replaceAutomaticWeeklyHighlights(weekId, "turnos", turnosDestaques);
  await replaceAutomaticWeeklyHighlights(weekId, "liberacoes", liberacoesDestaques);
}
