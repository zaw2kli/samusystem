import type { Timestamp } from "firebase/firestore";

export type StatusFuncionario = "ativo" | "inativo";

export interface Employee {
  id: string;
  nick: string;
  nickNormalized: string;
  cargo: string;
  contratacao: string | null; // ISO date string
  admissao: string | null; // ISO date string
  status: StatusFuncionario;
  metaTurnos: number;
  metaLiberacoes: number;
  turnosAtual: number;
  liberacoesAtual: number;
  observacao: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type NewEmployeeInput = Omit<
  Employee,
  "id" | "nickNormalized" | "createdAt" | "updatedAt"
>;

export interface Week {
  id: string;
  inicio: string; // ISO date
  fim: string; // ISO date
  responsavelId: string | null;
  responsavelNick: string | null;
  ativa: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface WeeklyHistory {
  id: string; // `${employeeId}_${weekId}`
  employeeId: string;
  employeeNick: string;
  weekId: string;
  turnos: number;
  liberacoes: number;
  metaTurnos: number;
  metaLiberacoes: number;
  status: StatusFuncionario;
  observacao: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type HighlightTipo = "semanal" | "mensal";
export type HighlightCategoria = "turnos" | "liberacoes";

export interface Highlight {
  id: string;
  weekId: string | null; // null para destaques mensais
  mesReferencia?: string | null; // "2026-09" para mensais
  tipo: HighlightTipo;
  categoria: HighlightCategoria;
  posicao: number;
  employeeId: string;
  nick: string;
  quantidade: number;
  premio: string;
  icone: string;
  automatico: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ImportStatus = "analisando" | "confirmado" | "cancelado" | "erro";

export interface ImportLog {
  id: string;
  arquivoNome: string;
  weekId: string;
  adminId: string;
  adminNome: string;
  totalLinhas: number;
  atualizados: number;
  novos: number;
  desativados: number;
  erros: number;
  status: ImportStatus;
  createdAt: Timestamp | null;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminNome: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhes: string;
  createdAt: Timestamp | null;
}

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  createdAt: Timestamp | null;
}

export interface SystemConfig {
  id: string;
  nomeSistema: string;
  descricao: string;
  duracaoTurnoMinutos: number;
  metaTurnosPadrao: number;
  metaLiberacoesPadrao: number;
  posicoesDestaqueTurnos: number;
  posicoesDestaqueLiberacoes: number;
  criterioDesempateSecundario: "liberacoes" | "turnos";
}

// ---- Tipos usados apenas durante a análise de importação (não são gravados) ----

export interface PlanilhaLinha {
  linha: number;
  nick: string;
  turnos: number;
  liberacoes: number;
}

export type AcaoImportacao = "atualizar" | "criar" | "desativar" | "ignorar";

export interface ImportDiffItem {
  linha?: number;
  nick: string;
  employeeId: string | null;
  acao: AcaoImportacao;
  cargo?: string;
  turnosFirebase: number | null;
  turnosPlanilha: number | null;
  turnosSemana: number | null;
  liberacoesFirebase: number | null;
  liberacoesPlanilha: number | null;
  liberacoesSemana: number | null;
  erro?: string;
  criarSeNovo?: boolean; // escolha do admin para novos funcionários
}

export interface ImportError {
  linha?: number;
  nick?: string;
  mensagem: string;
}

export interface ImportAnalysis {
  weekId: string;
  arquivoNome: string;
  totalLinhas: number;
  colunasDetectadas: { nick: string | null; turnos: string | null; liberacoes: string | null };
  itens: ImportDiffItem[];
  ausentes: ImportDiffItem[];
  duplicados: { nick: string; linhas: number[] }[];
  erros: ImportError[];
  podeConfirmar: boolean;
}

export interface ImportConfirmResult {
  atualizados: number;
  novos: number;
  desativados: number;
  erros: number;
  importId: string;
}
