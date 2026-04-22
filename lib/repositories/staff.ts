import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Staff, StaffInput } from "@/lib/schemas/staff";
import { listAll, removeDoc, updateDocById, fromSnap } from "./firestore-helpers";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

// `staff` usa el uid de Firebase Auth como doc id. Por eso el create es
// distinto del resto: set con id explícito, no addDoc.
const COL = "staff";

export interface StaffRepository {
  list(): Promise<Staff[]>;
  getById(uid: string): Promise<Staff | null>;
  upsert(uid: string, input: StaffInput): Promise<Staff>;
  update(uid: string, patch: Partial<StaffInput>): Promise<void>;
  remove(uid: string): Promise<void>;
}

export const staffRepo: StaffRepository = {
  list: () => listAll<Staff>(COL),
  async getById(uid) {
    const snap = await getDoc(doc(getDb(), COL, uid));
    if (!snap.exists()) return null;
    return fromSnap<Staff>(snap as unknown as QueryDocumentSnapshot<DocumentData>);
  },
  async upsert(uid, input) {
    const ref = doc(getDb(), COL, uid);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        ...input,
        createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    const updated = await getDoc(ref);
    return fromSnap<Staff>(updated as unknown as QueryDocumentSnapshot<DocumentData>);
  },
  update: (uid, patch) => updateDocById(COL, uid, patch),
  remove: (uid) => removeDoc(COL, uid),
};
