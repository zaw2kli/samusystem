"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { Card, Skeleton, Badge } from "@/components/ui/Surfaces";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getEmployeeById, updateEmployee } from "@/services/employees";
import { listHistoryByEmployee } from "@/services/weeklyHistory";
import { createAdminLog } from "@/services/logs";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import { formatNumber } from "@/utils/format";
import type { Employee, WeeklyHistory } from "@/types";

export default function EditarFuncionarioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { admin } = useAdmin();
  const { toast } = useToast();

  const [employee, setEmployee] = useState<Employee | null | undefined>(undefined);
  const [history, setHistory] = useState<WeeklyHistory[]>([]);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const emp = await getEmployeeById(id);
      setEmployee(emp);
      if (emp) {
        setForm(emp);
        setHistory(await listHistoryByEmployee(emp.id));
      }
    })();
  }, [id]);

  async function salvar() {
    if (!employee) return;
    setSalvando(true);
    try {
      await updateEmployee(employee.id, {
        nick: form.nick,
        cargo: form.cargo,
        contratacao: form.contratacao || null,
        admissao: form.admissao || null,
        status: form.status,
        metaTurnos: Number(form.metaTurnos) || 0,
        metaLiberacoes: Number(form.metaLiberacoes) || 0,
        turnosAtual: Number(form.turnosAtual) || 0,
        liberacoesAtual: Number(form.liberacoesAtual) || 0,
        observacao: form.observacao ?? "",
      });
      await createAdminLog({
        adminId: admin!.id,
        adminNome: admin!.nome,
        acao: "edicao",
        entidade: "employees",
        entidadeId: employee.id,
        detalhes: `Dados de ${employee.nick} atualizados manualmente.`,
      });
      toast("Alterações salvas.", "sucesso");
      router.refresh();
    } catch {
      toast("Não foi possível salvar as alterações.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  if (employee === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (employee === null) {
    return <p className="text-sm text-ink-faint">Funcionário não encontrado.</p>;
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/funcionarios" className="mb-4 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-accent">
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-ink">{employee.nick}</h1>
        <Badge tone={employee.status === "ativo" ? "ok" : "bad"}>{employee.status}</Badge>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nick">Nickname</Label>
            <Input id="nick" value={form.nick ?? ""} onChange={(e) => setForm({ ...form, nick: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="contratacao">Data de contratação</Label>
            <Input
              id="contratacao"
              type="date"
              value={form.contratacao ?? ""}
              onChange={(e) => setForm({ ...form, contratacao: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="admissao">Data de admissão</Label>
            <Input
              id="admissao"
              type="date"
              value={form.admissao ?? ""}
              onChange={(e) => setForm({ ...form, admissao: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status ?? "ativo"}
              onChange={(e) => setForm({ ...form, status: e.target.value as Employee["status"] })}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
          <div />
          <div>
            <Label htmlFor="metaTurnos">Meta de turnos</Label>
            <Input
              id="metaTurnos"
              type="number"
              value={form.metaTurnos ?? 0}
              onChange={(e) => setForm({ ...form, metaTurnos: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="metaLiberacoes">Meta de liberações</Label>
            <Input
              id="metaLiberacoes"
              type="number"
              value={form.metaLiberacoes ?? 0}
              onChange={(e) => setForm({ ...form, metaLiberacoes: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="turnosAtual">Turnos atuais</Label>
            <Input
              id="turnosAtual"
              type="number"
              value={form.turnosAtual ?? 0}
              onChange={(e) => setForm({ ...form, turnosAtual: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="liberacoesAtual">Liberações atuais</Label>
            <Input
              id="liberacoesAtual"
              type="number"
              value={form.liberacoesAtual ?? 0}
              onChange={(e) => setForm({ ...form, liberacoesAtual: Number(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-base-border pt-4">
          <Button onClick={salvar} loading={salvando}>
            <Save className="h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink">Histórico semanal</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-faint">Nenhum histórico registrado ainda.</p>
        ) : (
          <div className="overflow-hidden rounded border border-base-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border bg-base-800/60 text-left text-xs text-ink-faint">
                  <th className="px-4 py-2.5 font-medium">Semana</th>
                  <th className="px-4 py-2.5 font-medium">Turnos</th>
                  <th className="px-4 py-2.5 font-medium">Liberações</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} className={i % 2 === 0 ? "" : "bg-base-800/30"}>
                    <td className="px-4 py-2.5 text-ink-muted">{h.weekId}</td>
                    <td className="px-4 py-2.5 font-mono text-ink">{formatNumber(h.turnos)}</td>
                    <td className="px-4 py-2.5 font-mono text-ink">{formatNumber(h.liberacoes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
