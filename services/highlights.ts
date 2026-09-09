import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Highlight, HighlightCategoria } from "@/types";

const COLLECTION = "highlights";

function mapDoc(d: any): Highlight {
  return { id: d.id, ...d.data() } as Highlight;
}

export async function listHighlightsByWeek(weekId: string): Promise<Highlight[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("tipo", "==", "semanal"), where("weekId", "==", weekId))
  );
  return snap.docs.map(mapDoc).sort((a, b) => a.posicao - b.posicao);
}

export function listenHighlightsByWeek(weekId: string, cb: (rows: Highlight[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("tipo", "==", "semanal"), where("weekId", "==", weekId));
  return onSnapshot(q, (snap) => cb(snap.docs.map(mapDoc).sort((a, b) => a.posicao - b.posicao)));
}

export async function listHighlightsMensais(): Promise<Highlight[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), where("tipo", "==", "mensal")));
  return snap.docs.map(mapDoc);
}

/**
 * Remove somente os destaques AUTOMÁTICOS semanais de uma semana+categoria
 * (usado antes de recalcular ao reimportar) e recria com os novos.
 * Nunca toca em destaques mensais ou manuais.
 */
export async function replaceAutomaticWeeklyHighlights(
  weekId: string,
  categoria: HighlightCategoria,
  novos: Omit<Highlight, "id" | "createdAt" | "updatedAt">[]
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION),
      where("tipo", "==", "semanal"),
      where("weekId", "==", weekId),
      where("categoria", "==", categoria),
      where("automatico", "==", true)
    )
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(
    novos.map((h) =>
      addDoc(collection(db, COLLECTION), {
        ...h,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );
}

export async function createManualHighlight(
  input: Omit<Highlight, "id" | "createdAt" | "updatedAt" | "automatico">
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    automatico: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateHighlight(id: string, patch: Partial<Highlight>): Promise<void> {
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  delete (data as any).id;
  await updateDoc(doc(db, COLLECTION, id), data as any);
}

export async function deleteHighlight(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
