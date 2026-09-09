import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WeeklyHistory } from "@/types";

const COLLECTION = "weeklyHistory";

function mapDoc(d: any): WeeklyHistory {
  return { id: d.id, ...d.data() } as WeeklyHistory;
}

/** Id determinístico evita duplicar histórico ao reimportar a mesma semana. */
export function historyDocId(employeeId: string, weekId: string): string {
  return `${employeeId}_${weekId}`;
}

export function historyDocRef(employeeId: string, weekId: string) {
  return doc(db, COLLECTION, historyDocId(employeeId, weekId));
}

export async function listHistoryByEmployee(employeeId: string): Promise<WeeklyHistory[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("employeeId", "==", employeeId))
  );
  // ordenar pela semana mais recente primeiro (weekId cresce por criação; ordenamos por createdAt)
  return snap.docs
    .map(mapDoc)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function listHistoryByWeek(weekId: string): Promise<WeeklyHistory[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), where("weekId", "==", weekId)));
  return snap.docs.map(mapDoc);
}

export function listenHistoryByWeek(weekId: string, cb: (rows: WeeklyHistory[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("weekId", "==", weekId));
  return onSnapshot(q, (snap) => cb(snap.docs.map(mapDoc)));
}

export async function listAllHistory(): Promise<WeeklyHistory[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("createdAt", "desc")));
  return snap.docs.map(mapDoc);
}
