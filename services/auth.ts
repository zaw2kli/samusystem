import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AdminUser } from "@/types";

// IMPORTANTE: o documento em /admins/{uid} deve usar o UID do Firebase
// Authentication como ID (não um ID aleatório). Isso é o que permite às
// Firestore Security Rules validar "isAdmin()" com um simples get(),
// sem depender de uma consulta (list), que o público não tem permissão
// de executar. Crie o admin assim, por exemplo com o Admin SDK ou console:
//   setDoc(doc(db, "admins", user.uid), { nome, email, ativo: true, createdAt })

export async function loginAdmin(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const admin = await getAdminByUid(cred.user.uid);
  if (!admin || !admin.ativo) {
    await firebaseSignOut(auth);
    throw new Error("Este usuário não possui permissão administrativa ativa.");
  }
  return cred.user;
}

export async function logoutAdmin(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getAdminByUid(uid: string): Promise<AdminUser | null> {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "admins", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AdminUser;
}

/**
 * Observa o estado de autenticação e resolve para o AdminUser correspondente
 * (ou null se não estiver logado / não for admin ativo).
 */
export function watchAdmin(cb: (admin: AdminUser | null, user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null, null);
      return;
    }
    const admin = await getAdminByUid(user.uid);
    cb(admin && admin.ativo ? admin : null, user);
  });
}
