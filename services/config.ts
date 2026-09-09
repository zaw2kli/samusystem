import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SystemConfig } from "@/types";

const DOC_ID = "geral";

export const DEFAULT_CONFIG: SystemConfig = {
  id: DOC_ID,
  nomeSistema: "SAMU · Painel Operacional",
  descricao: "Gestão de equipe e acompanhamento semanal de produtividade.",
  duracaoTurnoMinutos: 10,
  metaTurnosPadrao: 0,
  metaLiberacoesPadrao: 0,
  posicoesDestaqueTurnos: 2,
  posicoesDestaqueLiberacoes: 1,
  criterioDesempateSecundario: "liberacoes",
};

export async function getConfig(): Promise<SystemConfig> {
  const snap = await getDoc(doc(db, "config", DOC_ID));
  if (!snap.exists()) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...snap.data(), id: DOC_ID } as SystemConfig;
}

export function listenConfig(cb: (config: SystemConfig) => void): Unsubscribe {
  return onSnapshot(doc(db, "config", DOC_ID), (snap) => {
    cb(snap.exists() ? ({ ...DEFAULT_CONFIG, ...snap.data(), id: DOC_ID } as SystemConfig) : DEFAULT_CONFIG);
  });
}

export async function saveConfig(patch: Partial<SystemConfig>): Promise<void> {
  await setDoc(doc(db, "config", DOC_ID), patch, { merge: true });
}
