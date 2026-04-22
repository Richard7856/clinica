import { query, where, limit } from "firebase/firestore";
import type { Patient, PatientInput } from "@/lib/schemas/patient";
import type { Repository } from "./types";
import {
  col,
  createDoc,
  getOne,
  listAll,
  removeDoc,
  updateDocById,
  fromSnap,
} from "./firestore-helpers";
import { getDocs } from "firebase/firestore";
import { nanoid } from "./nanoid";

const COL = "patients";

export interface PatientsRepository extends Repository<PatientInput, Patient> {
  findByQrSlug(slug: string): Promise<Patient | null>;
}

export const patientsRepo: PatientsRepository = {
  list: () => listAll<Patient>(COL),
  getById: (id) => getOne<Patient>(COL, id),
  async create(input: PatientInput) {
    // Genera un slug de 10 chars url-safe. Chance de colisión despreciable
    // para el volumen esperado, pero aun así reintentamos ante un match.
    let qrSlug = nanoid(10);
    for (let attempts = 0; attempts < 3; attempts++) {
      const existing = await patientsRepo.findByQrSlug(qrSlug);
      if (!existing) break;
      qrSlug = nanoid(10);
    }
    return createDoc<Patient>(COL, {
      ...input,
      qrSlug,
      points: 0,
    });
  },
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async findByQrSlug(slug: string) {
    const snap = await getDocs(
      query(col(COL), where("qrSlug", "==", slug), limit(1)),
    );
    const first = snap.docs[0];
    return first ? fromSnap<Patient>(first) : null;
  },
};
