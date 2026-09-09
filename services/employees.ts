import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Employee, NewEmployeeInput, StatusFuncionario } from "@/types";
import { normalizeNick } from "@/utils/normalize";

const COLLECTION = "employees";

function mapDoc(d: any): Employee {
  return { id: d.id, ...d.data() } as Employee;
}

export async function listEmployees(): Promise<Employee[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("nick")));
  return snap.docs.map(mapDoc);
}

export function listenEmployees(
  cb: (employees: Employee[]) => void,
  status?: StatusFuncionario
): Unsubscribe {
  const q = status
    ? query(collection(db, COLLECTION), where("status", "==", status), orderBy("nick"))
    : query(collection(db, COLLECTION), orderBy("nick"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(mapDoc)));
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Employee) : null;
}

/** Busca pública por nick normalizado (correspondência parcial, só ativos). */
export async function findEmployeeByNick(nick: string): Promise<Employee | null> {
  const target = normalizeNick(nick);
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("nickNormalized", "==", target), where("status", "==", "ativo"))
  );
  if (!snap.empty) return mapDoc(snap.docs[0]);

  // fallback: correspondência parcial entre ativos (dataset pequeno o suficiente para filtrar em memória)
  const allActive = await getDocs(query(collection(db, COLLECTION), where("status", "==", "ativo")));
  const found = allActive.docs.find((d) => (d.data().nickNormalized as string)?.includes(target));
  return found ? mapDoc(found) : null;
}

/** Autocomplete público: retorna nicks ativos que contêm o termo. */
export async function searchActiveEmployees(term: string, max = 8): Promise<Employee[]> {
  const target = normalizeNick(term);
  if (!target) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), where("status", "==", "ativo")));
  return snap.docs
    .map(mapDoc)
    .filter((e) => e.nickNormalized.includes(target))
    .slice(0, max);
}

export async function findEmployeeByNickNormalizedAny(nickNormalized: string): Promise<Employee | null> {
  const snap = await getDocs(query(collection(db, COLLECTION), where("nickNormalized", "==", nickNormalized)));
  return snap.empty ? null : mapDoc(snap.docs[0]);
}

export async function createEmployee(input: NewEmployeeInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    nickNormalized: normalizeNick(input.nick),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<void> {
  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.nick) data.nickNormalized = normalizeNick(patch.nick);
  delete (data as any).id;
  await updateDoc(doc(db, COLLECTION, id), data as any);
}

export async function setEmployeeStatus(id: string, status: StatusFuncionario): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: serverTimestamp() });
}

export async function deleteEmployeePermanently(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
