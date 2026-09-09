"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Power, PowerOff } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui/Surfaces";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  listenEmployees,
  createEmployee,
  setEmployeeStatus,
  deleteEmployeePermanently,
} from "@/services/employees";
import { createAdminLog } from "@/services/logs";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { matchesSearch } from "@/utils/normalize";
import type { Employee, StatusFuncionario } from "@/types";

export default function FuncionariosPage() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFuncionario | "todos">("todos");
  const [novoOpen, setNovoOpen] = useState(false);
  const [excluir, setExcluir] = useState<Employee | null>(null);

  useEffect(() => listenEmployees(setEmployees), []);

  const filtrados = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => {
      if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;
      if (busca && !matchesSearch(e.nickNormalized, busca)) return false;
      return true;
    });
  }, [employees, busca, filtroStatus]);

  async function toggleStatus(emp: Employee) {
    const novo: StatusFuncionario = emp.status === "ativo" ? "inativo" : "ativo";
    await setEmployeeStatus(emp.id, novo);
    await createAdminLog({
      adminId: admin!.id,
      adminNome: admin!.nome,
      acao: novo === "ativo" ? "reativacao" : "desativacao",
      entidade: "employees",
      entidadeId: emp.id,
      detalhes: `Funcionário ${emp.nick} marcado como ${novo}.`,
    });
    toast(`${emp.nick} agora está ${novo}.`, "sucesso");
  }

  async function handleExcluir() {
    if (!excluir) return;
    await deleteEmployeePermanently(excluir.id);
    await createAdminLog({
      adminId: admin!.id,
      adminNome: admin!.nome,
      acao: "exclusao_definitiva",
      entidade: "employees",
      entidadeId: excluir.id,
      detalhes: `Funcionário ${excluir.nick} excluído definitivamente.`,
    });
    toast(`${excluir.nick} foi excluído definitivamente.`, "atencao");
    setExcluir(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Funcionários</h1>
          <p className="text-sm text-ink-faint">Gerencie o cadastro da equipe.</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4" /> Novo funcionário
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input placeholder="Buscar por nick…" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
        <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className="w-40">
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </Select>
      </div>

      {employees === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState title="Nenhum funcionário encontrado" description="Ajuste os filtros ou cadastre um novo funcionário." />
      ) : (
        <div className="overflow-hidden rounded border border-base-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Nick</th>
                <th className="px-4 py-2.5 font-medium">Cargo</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Turnos</th>
                <th className="px-4 py-2.5 font-medium">Liberações</th>
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/funcionarios/${e.id}`} className="text-ink hover:text-accent">
                      {e.nick}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">{e.cargo}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={e.status === "ativo" ? "ok" : "bad"}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-ink-muted">{e.turnosAtual}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-muted">{e.liberacoesAtual}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        title={e.status === "ativo" ? "Desativar" : "Reativar"}
                        onClick={() => toggleStatus(e)}
                        className="rounded p-1.5 text-ink-faint hover:bg-base-700 hover:text-ink"
                      >
                        {e.status === "ativo" ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        title="Excluir definitivamente"
                        onClick={() => setExcluir(e)}
                        className="rounded p-1.5 text-ink-faint hover:bg-status-bad/10 hover:text-status-bad"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NovoFuncionarioModal open={novoOpen} onClose={() => setNovoOpen(false)} />

      <Modal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        title="Excluir definitivamente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleExcluir}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Isso removerá <span className="text-ink">{excluir?.nick}</span> permanentemente do cadastro. Prefira
          desativar em vez de excluir — a exclusão não pode ser desfeita. O histórico e os destaques já registrados
          não serão apagados.
        </p>
      </Modal>
    </div>
  );
}

function NovoFuncionarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [nick, setNick] = useState("");
  const [cargo, setCargo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!nick.trim()) {
      setErro("Informe o nickname.");
      return;
    }
    setSalvando(true);
    try {
      const id = await createEmployee({
        nick: nick.trim(),
        cargo: cargo.trim() || "Não definido",
        contratacao: null,
        admissao: null,
        status: "ativo",
        metaTurnos: 0,
        metaLiberacoes: 0,
        turnosAtual: 0,
        liberacoesAtual: 0,
        observacao: "",
      });
      await createAdminLog({
        adminId: admin!.id,
        adminNome: admin!.nome,
        acao: "criacao",
        entidade: "employees",
        entidadeId: id,
        detalhes: `Funcionário ${nick} criado manualmente.`,
      });
      toast("Funcionário criado com sucesso.", "sucesso");
      setNick("");
      setCargo("");
      onClose();
    } catch {
      setErro("Não foi possível criar o funcionário.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo funcionário"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={salvando}>
            Criar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Nickname</label>
          <Input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Ex.: Isita" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Cargo</label>
          <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Socorrista" />
        </div>
        {erro && <p className="text-xs text-status-bad">{erro}</p>}
      </div>
    </Modal>
  );
}
