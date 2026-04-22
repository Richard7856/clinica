import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { ClinicSettings } from "@/lib/schemas/settings";
import { fromSnap } from "./firestore-helpers";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

// Doc único settings/clinic. Lectura frecuente (logo, puntos, timezone) →
// candidato natural para cache vía react-query con staleTime largo.

const PATH = { col: "settings", id: "clinic" };

export const settingsRepo = {
  async get(): Promise<ClinicSettings | null> {
    const snap = await getDoc(doc(getDb(), PATH.col, PATH.id));
    if (!snap.exists()) return null;
    return fromSnap<ClinicSettings & { id: string }>(
      snap as unknown as QueryDocumentSnapshot<DocumentData>,
    );
  },
  async save(input: Partial<ClinicSettings>): Promise<void> {
    const ref = doc(getDb(), PATH.col, PATH.id);
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
  },
};
