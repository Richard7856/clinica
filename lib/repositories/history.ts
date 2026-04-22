import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { HistoryEntry, HistoryEntryInput } from "@/lib/schemas/patient";
import { fromSnap } from "./firestore-helpers";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

// Subcolección patients/{patientId}/history — notas clínicas por paciente.
// Vive bajo el doc del paciente para que las reglas Firestore hereden acceso.

export const historyRepo = {
  async list(patientId: string): Promise<HistoryEntry[]> {
    const ref = collection(getDb(), "patients", patientId, "history");
    const snap = await getDocs(query(ref, orderBy("date", "desc")));
    return snap.docs.map((d) =>
      fromSnap<HistoryEntry>(d as QueryDocumentSnapshot<DocumentData>),
    );
  },

  async add(patientId: string, input: HistoryEntryInput): Promise<void> {
    const ref = collection(getDb(), "patients", patientId, "history");
    await addDoc(ref, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
