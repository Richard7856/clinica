import { query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Checkin, CheckinInput } from "@/lib/schemas/checkin";
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

const COL = "checkins";

export interface CheckinsRepository extends Repository<CheckinInput, Checkin> {
  listByDay(dayIso: string): Promise<Checkin[]>;
}

export const checkinsRepo: CheckinsRepository = {
  list: () => listAll<Checkin>(COL),
  getById: (id) => getOne<Checkin>(COL, id),
  create: (input) => createDoc<Checkin>(COL, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async listByDay(dayIso) {
    const start = new Date(dayIso);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const snap = await getDocs(
      query(
        col(COL),
        where("timestamp", ">=", Timestamp.fromDate(start)),
        where("timestamp", "<=", Timestamp.fromDate(end)),
        orderBy("timestamp", "desc"),
      ),
    );
    return snap.docs.map((d) => fromSnap<Checkin>(d));
  },
};
