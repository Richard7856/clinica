import { query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Appointment, AppointmentInput } from "@/lib/schemas/appointment";
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

const COL = "appointments";

export interface AppointmentsRepository extends Repository<AppointmentInput, Appointment> {
  listByRange(fromIso: string, toIso: string): Promise<Appointment[]>;
  findOverlapsInCabin(cabinId: string, startIso: string, endIso: string): Promise<Appointment[]>;
}

export const appointmentsRepo: AppointmentsRepository = {
  list: () => listAll<Appointment>(COL),
  getById: (id) => getOne<Appointment>(COL, id),
  create: (input) => createDoc<Appointment>(COL, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async listByRange(fromIso, toIso) {
    const snap = await getDocs(
      query(
        col(COL),
        where("startAt", ">=", Timestamp.fromDate(new Date(fromIso))),
        where("startAt", "<=", Timestamp.fromDate(new Date(toIso))),
        orderBy("startAt", "asc"),
      ),
    );
    return snap.docs.map((d) => fromSnap<Appointment>(d));
  },

  // Detección de choques simple: trae citas de la misma cabina cuyo rango
  // se solapa con [startIso, endIso]. El filtrado fino se hace en memoria
  // porque Firestore no soporta dos rangos en una misma query.
  async findOverlapsInCabin(cabinId, startIso, endIso) {
    const snap = await getDocs(
      query(
        col(COL),
        where("cabinId", "==", cabinId),
        where("status", "in", ["scheduled", "confirmed", "in_progress"]),
      ),
    );
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return snap.docs
      .map((d) => fromSnap<Appointment>(d))
      .filter((a) => {
        const s = new Date(a.startAt).getTime();
        const e = new Date(a.endAt).getTime();
        return s < end && e > start; // solapa
      });
  },
};
