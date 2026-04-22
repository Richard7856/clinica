import { query, where, orderBy, getDocs } from "firebase/firestore";
import type { Package, PackageInput } from "@/lib/schemas/package";
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

const COL = "packages";

export interface PackagesRepository extends Repository<PackageInput, Package> {
  listByPatient(patientId: string): Promise<Package[]>;
}

export const packagesRepo: PackagesRepository = {
  list: () => listAll<Package>(COL),
  getById: (id) => getOne<Package>(COL, id),
  create: (input) =>
    createDoc<Package>(COL, {
      ...input,
      usedSessions: 0,
      status: "active",
    }),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async listByPatient(patientId: string) {
    const snap = await getDocs(
      query(col(COL), where("patientId", "==", patientId), orderBy("purchasedAt", "desc")),
    );
    return snap.docs.map((d) => fromSnap<Package>(d));
  },
};
