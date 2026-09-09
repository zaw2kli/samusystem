"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, XCircle, UserCog } from "lucide-react";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/Surfaces";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { listWeeks, createWeek, activateWeek, deactivateWeek, setResponsavel } from "@/services/weeks";
import { listEmployees } from "@/services/employees";
import { createAdminLog } from "@/services/logs";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { formatPeriodo } from "@/utils/format";
import type { Employee, Week } from "@/types";

export default function SemanasPage() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [novoOpen, setNovoOpen] = useState(false);
  const [responsavelOpen, setResponsavelOpen] = useState<Week | null>(null);

  async function reload() {
    setWeeks(await listWeeks());
  }

  useEffect(() => {
    reload();
    listEmployees().then(setEmployees);
  }, []);

  async function toggleAtiva(week: Week) {
    if (week.ativa) {
      await deactivateWeek(week.id);
    } else {
      await activateWeek(week.id);
    }
    await createAdminLog({
      adminId: admin!.id,
      adminNome: admin!.nome,
      acao: week.ativa ? "semana_desativada" : "semana_ativada",
      entidade: "weeks",
      entidadeId: week.id,
      detalhes: `Semana ${formatPeriodo(week.inicio, week.fim)} ${week.ativa ? "desativada" : "ativada"}.`,
    });
    toast(week.ativa ? "Semana desativada." : "Semana ativada.", "sucesso");
    reload();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Semanas</h1>
          <p className="text-sm text-ink-faint">Controle o período ativo e o responsável de cada semana.</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4" /> Nova semana
        </Button>
      </div>

      {weeks === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <EmptyState title="Nenhuma semana cadastrada" description="Crie a primeira semana para começar a registrar o histórico." />
      ) : (
        <div className="space-y-2">
          {weeks.map((w) => (
            <Card key={w.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm text-ink">{formatPeriodo(w.inicio, w.fim)}</p>
                  {w.ativa && <Badge tone="ok">ativa</Badge>}
                </div>
                <p className="text-xs text-ink-faint">
                  Responsável: {w.responsavelNick ?? "não definido"} · ID: <span className="font-mono">{w.id}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setResponsavelOpen(w)}>
                  <UserCog className="h-3.5 w-3.5" /> Responsável
                </Button>
                <Button variant={w.ativa ? "danger" : "secondary"} size="sm" onClick={() => toggleAtiva(w)}>
                  {w.ativa ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {w.ativa ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NovaSemanaModal open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={reload} />

      {responsavelOpen && (
        <ResponsavelModal
          week={responsavelOpen}
          employees={employees}
          onClose={() => setResponsavelOpen(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function NovaSemanaModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!inicio || !fim) {
      setErro("Informe início e fim do período.");
      return;
    }
    setSalvando(true);
    try {
      const id = await createWeek({ inicio, fim });
      await createAdminLog({
        adminId: admin!.id,
        adminNome: admin!.nome,
        acao: "criacao",
        entidade: "weeks",
        entidadeId: id,
        detalhes: `Semana ${formatPeriodo(inicio, fim)} criada.`,
      });
      toast("Semana criada.", "sucesso");
      setInicio("");
      setFim("");
      onCreated();
      onClose();
    } catch {
      setErro("Não foi possível criar a semana.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova semana"
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="inicio">Início</Label>
          <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fim">Fim</Label>
          <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>
      {erro && <p className="mt-3 text-xs text-status-bad">{erro}</p>}
    </Modal>
  );
}

function ResponsavelModal({
  week,
  employees,
  onClose,
  onSaved,
}: {
  week: Week;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [selecionado, setSelecionado] = useState(week.responsavelId ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const emp = employees.find((e) => e.id === selecionado) ?? null;
    await setResponsavel(week.id, emp?.id ?? null, emp?.nick ?? null);
    await createAdminLog({
      adminId: admin!.id,
      adminNome: admin!.nome,
      acao: "responsavel_alterado",
      entidade: "weeks",
      entidadeId: week.id,
      detalhes: `Responsável da semana definido como ${emp?.nick ?? "nenhum"}.`,
    });
    toast("Responsável atualizado.", "sucesso");
    setSalvando(false);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Responsável da semana"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={salvando}>
            Salvar
          </Button>
        </>
      }
    >
      <Label htmlFor="responsavel">Funcionário responsável</Label>
      <Select id="responsavel" value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
        <option value="">Nenhum</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nick}
          </option>
        ))}
      </Select>
    </Modal>
  );
}
