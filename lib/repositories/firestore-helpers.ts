import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

// Utilidades internas para no repetir código en cada repositorio Firestore.
// Convierte Timestamp <-> ISO string en los bordes: todo el código de app
// trabaja con ISO strings para evitar acarrear el tipo propio de Firestore.

export const col = (name: string): CollectionReference<DocumentData> =>
  collection(getDb(), name);

export const toIso = (v: unknown): string => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? v : new Date().toISOString();
};

// Serializa un doc snapshot a un objeto con `id` y timestamps como ISO.
export function fromSnap<T>(snap: QueryDocumentSnapshot<DocumentData>): T & { id: string } {
  const data = snap.data();
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  }
  return out as T & { id: string };
}

export async function listAll<T>(
  name: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const snap = await getDocs(query(col(name), ...constraints));
  return snap.docs.map((d) => fromSnap<T>(d));
}

export async function getOne<T>(name: string, id: string): Promise<T | null> {
  const ref = doc(getDb(), name, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromSnap<T>(snap as unknown as QueryDocumentSnapshot<DocumentData>);
}

export async function createDoc<T extends { id: string }>(
  name: string,
  input: Record<string, unknown>,
): Promise<T> {
  const payload = {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(col(name), payload);
  const snap = await getDoc(ref);
  return fromSnap<T>(snap as unknown as QueryDocumentSnapshot<DocumentData>);
}

export async function updateDocById(
  name: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(getDb(), name, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function removeDoc(name: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), name, id));
}
