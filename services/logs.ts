import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  limit as fsLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminLog, ImportLog, ImportStatus } from "@/types";

const IMPORTS = "imports";
const LOGS = "logs";

export async function createImportLog(input: {
  arquivoNome: string;
  weekId: string;
  adminId: string;
  adminNome: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, IMPORTS), {
    ...input,
    totalLinhas: 0,
    atualizados: 0,
    novos: 0,
    desativados: 0,
    erros: 0,
    status: "analisando" as ImportStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateImportLog(id: string, patch: Partial<ImportLog>): Promise<void> {
  const data: Record<string, unknown> = { ...patch };
  delete (data as any).id;
  delete (data as any).createdAt;
  await updateDoc(doc(db, IMPORTS, id), data as any);
}

export async function listImportLogs(max = 50): Promise<ImportLog[]> {
  const snap = await getDocs(query(collection(db, IMPORTS), orderBy("createdAt", "desc"), fsLimit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ImportLog);
}

export async function createAdminLog(input: {
  adminId: string;
  adminNome: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhes: string;
}): Promise<void> {
  await addDoc(collection(db, LOGS), { ...input, createdAt: serverTimestamp() });
}

export async function listAdminLogs(max = 100): Promise<AdminLog[]> {
  const snap = await getDocs(query(collection(db, LOGS), orderBy("createdAt", "desc"), fsLimit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminLog);
}
