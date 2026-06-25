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
    // dayIso es YYYY-MM-DD; construimos el rango en hora LOCAL (no UTC).
    // `new Date("2026-06-25")` se interpreta como medianoche UTC y desplazaba
    // el rango medio día en México (UTC-6).
    const [y, m, d] = dayIso.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
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
