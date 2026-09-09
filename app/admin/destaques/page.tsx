"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui/Surfaces";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { listWeeks } from "@/services/weeks";
import { listEmployees } from "@/services/employees";
import {
  listHighlightsByWeek,
  listHighlightsMensais,
  createManualHighlight,
  deleteHighlight,
} from "@/services/highlights";
import { createAdminLog } from "@/services/logs";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { formatNumber, formatPeriodo } from "@/utils/format";
import type { Employee, Highlight, HighlightCategoria, Week } from "@/types";

export default function DestaquesPage() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState("");
  const [semanais, setSemanais] = useState<Highlight[] | null>(null);
  const [mensais, setMensais] = useState<Highlight[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [novoOpen, setNovoOpen] = useState(false);

  useEffect(() => {
    listWeeks().then((w) => {
      setWeeks(w);
      if (w[0]) setWeekId(w[0].id);
    });
    listEmployees().then(setEmployees);
    listHighlightsMensais().then(setMensais);
  }, []);

  async function reloadSemanais() {
    if (!weekId) return;
    setSemanais(await listHighlightsByWeek(weekId));
  }

  useEffect(() => {
    setSemanais(null);
    reloadSemanais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  async function remover(h: Highlight) {
    await deleteHighlight(h.id);
    await createAdminLog({
      adminId: admin!.id,
      adminNome: admin!.nome,
      acao: "destaque_removido",
      entidade: "highlights",
      entidadeId: h.id,
      detalhes: `Destaque de ${h.nick} (${h.categoria}, ${h.tipo}) removido.`,
    });
    toast("Destaque removido.", "sucesso");
    reloadSemanais();
    listHighlightsMensais().then(setMensais);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Destaques</h1>
          <p className="text-sm text-ink-faint">Destaques semanais automáticos e destaques mensais manuais.</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4" /> Novo destaque manual
        </Button>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Semanais</h2>
          <Select value={weekId} onChange={(e) => setWeekId(e.target.value)} className="w-56">
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {formatPeriodo(w.inicio, w.fim)} {w.ativa ? "(ativa)" : ""}
              </option>
            ))}
          </Select>
        </div>
        {semanais === null ? (
          <Skeleton className="h-24 w-full" />
        ) : semanais.length === 0 ? (
          <EmptyState title="Sem destaques nesta semana" description="Os destaques automáticos aparecem após a importação da planilha." />
        ) : (
          <HighlightList destaques={semanais} onRemove={remover} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Mensais</h2>
        {mensais === null ? (
          <Skeleton className="h-24 w-full" />
        ) : mensais.length === 0 ? (
          <EmptyState title="Nenhum destaque mensal" description="Cadastre destaques mensais manualmente — eles não são alterados pela importação." />
        ) : (
          <HighlightList destaques={mensais} onRemove={remover} />
        )}
      </section>

      <NovoDestaqueModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        employees={employees}
        weeks={weeks}
        onCreated={() => {
          reloadSemanais();
          listHighlightsMensais().then(setMensais);
        }}
      />
    </div>
  );
}

function HighlightList({ destaques, onRemove }: { destaques: Highlight[]; onRemove: (h: Highlight) => void }) {
  return (
    <div className="space-y-2">
      {destaques.map((h) => (
        <Card key={h.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{h.icone}</span>
            <div>
              <p className="text-sm text-ink">
                {h.nick} — {h.categoria === "turnos" ? "Turnos" : "Liberações"} #{h.posicao}
              </p>
              <p className="text-xs text-ink-faint">
                {formatNumber(h.quantidade)} · {h.automatico ? "automático" : "manual"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={h.tipo === "semanal" ? "info" : "neutral"}>{h.tipo}</Badge>
            <button onClick={() => onRemove(h)} className="rounded p-1.5 text-ink-faint hover:bg-status-bad/10 hover:text-status-bad">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NovoDestaqueModal({
  open,
  onClose,
  employees,
  weeks,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  weeks: Week[];
  onCreated: () => void;
}) {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"semanal" | "mensal">("mensal");
  const [weekId, setWeekId] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [categoria, setCategoria] = useState<HighlightCategoria>("turnos");
  const [posicao, setPosicao] = useState("1");
  const [quantidade, setQuantidade] = useState("0");
  const [premio, setPremio] = useState("");
  const [icone, setIcone] = useState("🏆");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) {
      toast("Selecione um funcionário.", "atencao");
      return;
    }
    setSalvando(true);
    try {
      const id = await createManualHighlight({
        tipo,
        weekId: tipo === "semanal" ? weekId : null,
        mesReferencia: tipo === "mensal" ? mesReferencia : null,
        categoria,
        posicao: Number(posicao),
        employeeId: emp.id,
        nick: emp.nick,
        quantidade: Number(quantidade),
        premio,
        icone,
      });
      await createAdminLog({
        adminId: admin!.id,
        adminNome: admin!.nome,
        acao: "destaque_criado",
        entidade: "highlights",
        entidadeId: id,
        detalhes: `Destaque manual (${tipo}) criado para ${emp.nick}.`,
      });
      toast("Destaque criado.", "sucesso");
      onCreated();
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo destaque manual"
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
          <Label htmlFor="d-tipo">Tipo</Label>
          <Select id="d-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
          </Select>
        </div>
        {tipo === "semanal" ? (
          <div>
            <Label htmlFor="d-semana">Semana</Label>
            <Select id="d-semana" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
              <option value="">Selecione…</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {formatPeriodo(w.inicio, w.fim)}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="d-mes">Mês de referência</Label>
            <Input id="d-mes" type="month" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} />
          </div>
        )}
        <div>
          <Label htmlFor="d-func">Funcionário</Label>
          <Select id="d-func" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nick}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="d-categoria">Categoria</Label>
            <Select id="d-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as HighlightCategoria)}>
              <option value="turnos">Turnos</option>
              <option value="liberacoes">Liberações</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="d-posicao">Posição</Label>
            <Input id="d-posicao" type="number" min={1} value={posicao} onChange={(e) => setPosicao(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="d-quantidade">Quantidade</Label>
            <Input id="d-quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="d-icone">Ícone</Label>
            <Input id="d-icone" value={icone} onChange={(e) => setIcone(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="d-premio">Prêmio (opcional)</Label>
          <Input id="d-premio" value={premio} onChange={(e) => setPremio(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
