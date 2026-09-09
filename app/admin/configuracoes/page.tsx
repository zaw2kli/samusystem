"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card, Skeleton } from "@/components/ui/Surfaces";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getConfig, saveConfig } from "@/services/config";
import { createAdminLog } from "@/services/logs";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/useToast";
import type { SystemConfig } from "@/types";

export default function ConfiguracoesPage() {
  const { admin } = useAdmin();
  const { toast } = useToast();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    try {
      await saveConfig(config);
      await createAdminLog({
        adminId: admin!.id,
        adminNome: admin!.nome,
        acao: "configuracao_alterada",
        entidade: "config",
        entidadeId: "geral",
        detalhes: "Configurações do sistema atualizadas.",
      });
      toast("Configurações salvas.", "sucesso");
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return <Skeleton className="h-96 max-w-2xl" />;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-ink">Configurações</h1>
      <p className="mb-6 text-sm text-ink-faint">Parâmetros gerais do sistema.</p>

      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nomeSistema">Nome do sistema</Label>
            <Input
              id="nomeSistema"
              value={config.nomeSistema}
              onChange={(e) => setConfig({ ...config, nomeSistema: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={config.descricao}
              onChange={(e) => setConfig({ ...config, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duracaoTurno">Duração padrão do turno (min)</Label>
              <Input
                id="duracaoTurno"
                type="number"
                value={config.duracaoTurnoMinutos}
                onChange={(e) => setConfig({ ...config, duracaoTurnoMinutos: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="desempate">Critério de desempate</Label>
              <Select
                id="desempate"
                value={config.criterioDesempateSecundario}
                onChange={(e) => setConfig({ ...config, criterioDesempateSecundario: e.target.value as any })}
              >
                <option value="liberacoes">Liberações</option>
                <option value="turnos">Turnos</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="metaTurnosPadrao">Meta de turnos padrão</Label>
              <Input
                id="metaTurnosPadrao"
                type="number"
                value={config.metaTurnosPadrao}
                onChange={(e) => setConfig({ ...config, metaTurnosPadrao: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="metaLiberacoesPadrao">Meta de liberações padrão</Label>
              <Input
                id="metaLiberacoesPadrao"
                type="number"
                value={config.metaLiberacoesPadrao}
                onChange={(e) => setConfig({ ...config, metaLiberacoesPadrao: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="posTurnos">Posições de destaque — turnos</Label>
              <Input
                id="posTurnos"
                type="number"
                min={1}
                value={config.posicoesDestaqueTurnos}
                onChange={(e) => setConfig({ ...config, posicoesDestaqueTurnos: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="posLiberacoes">Posições de destaque — liberações</Label>
              <Input
                id="posLiberacoes"
                type="number"
                min={1}
                value={config.posicoesDestaqueLiberacoes}
                onChange={(e) => setConfig({ ...config, posicoesDestaqueLiberacoes: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-base-border pt-4">
          <Button onClick={salvar} loading={salvando}>
            <Save className="h-4 w-4" /> Salvar configurações
          </Button>
        </div>
      </Card>
    </div>
  );
}
