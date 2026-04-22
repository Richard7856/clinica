import { query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Payment, PaymentInput } from "@/lib/schemas/payment";
import type { Repository } from "./types";
import {
  col,
  createDoc,
  fromSnap,
  getOne,
  listAll,
  removeDoc,
  updateDocById,
} from "./firestore-helpers";

const COL = "payments";

export interface PaymentsRepository extends Repository<PaymentInput, Payment> {
  listByRange(fromIso: string, toIso: string): Promise<Payment[]>;
  listByPatient(patientId: string): Promise<Payment[]>;
}

export const paymentsRepo: PaymentsRepository = {
  list: () => listAll<Payment>(COL),
  getById: (id) => getOne<Payment>(COL, id),
  create: (input) => createDoc<Payment>(COL, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async listByRange(fromIso, toIso) {
    const snap = await getDocs(
      query(
        col(COL),
        where("date", ">=", Timestamp.fromDate(new Date(fromIso))),
        where("date", "<=", Timestamp.fromDate(new Date(toIso))),
        orderBy("date", "asc"),
      ),
    );
    return snap.docs.map((d) => fromSnap<Payment>(d));
  },

  async listByPatient(patientId) {
    const snap = await getDocs(
      query(col(COL), where("patientId", "==", patientId), orderBy("date", "desc")),
    );
    return snap.docs.map((d) => fromSnap<Payment>(d));
  },
};
