import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Week } from "@/types";

const COLLECTION = "weeks";

function mapDoc(d: any): Week {
  return { id: d.id, ...d.data() } as Week;
}

export async function listWeeks(): Promise<Week[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("inicio", "desc")));
  return snap.docs.map(mapDoc);
}

export function listenActiveWeek(cb: (week: Week | null) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("ativa", "==", true));
  return onSnapshot(q, (snap) => cb(snap.empty ? null : mapDoc(snap.docs[0])));
}

export async function getActiveWeek(): Promise<Week | null> {
  const snap = await getDocs(query(collection(db, COLLECTION), where("ativa", "==", true)));
  return snap.empty ? null : mapDoc(snap.docs[0]);
}

export async function getWeekById(id: string): Promise<Week | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Week) : null;
}

export async function createWeek(input: {
  inicio: string;
  fim: string;
  responsavelId?: string | null;
  responsavelNick?: string | null;
}): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    inicio: input.inicio,
    fim: input.fim,
    responsavelId: input.responsavelId ?? null,
    responsavelNick: input.responsavelNick ?? null,
    ativa: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWeek(id: string, patch: Partial<Week>): Promise<void> {
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  delete (data as any).id;
  await updateDoc(doc(db, COLLECTION, id), data as any);
}

/** Garante que apenas uma semana fique marcada como ativa por vez. */
export async function activateWeek(id: string): Promise<void> {
  const weeksSnap = await getDocs(collection(db, COLLECTION));
  await runTransaction(db, async (tx) => {
    weeksSnap.docs.forEach((d) => {
      if (d.id === id) {
        tx.update(d.ref, { ativa: true, updatedAt: serverTimestamp() });
      } else if (d.data().ativa) {
        tx.update(d.ref, { ativa: false, updatedAt: serverTimestamp() });
      }
    });
  });
}

export async function deactivateWeek(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { ativa: false, updatedAt: serverTimestamp() });
}

export async function setResponsavel(
  id: string,
  responsavelId: string | null,
  responsavelNick: string | null
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    responsavelId,
    responsavelNick,
    updatedAt: serverTimestamp(),
  });
}
