import {
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Session, SessionInput } from "@/lib/schemas/session";
import type { Package } from "@/lib/schemas/package";
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

const COL = "sessions";

export interface SessionsRepository extends Repository<SessionInput, Session> {
  registerFromPackage(input: SessionInput & { packageId: string }): Promise<Session>;
  listByDateRange(fromIso: string, toIso: string): Promise<Session[]>;
  listByPatient(patientId: string): Promise<Session[]>;
}

export const sessionsRepo: SessionsRepository = {
  list: () => listAll<Session>(COL),
  getById: (id) => getOne<Session>(COL, id),
  create: (input) => createDoc<Session>(COL, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  // Transacción: crea la sesión e incrementa usedSessions del paquete,
  // rechazando si ya estaba agotado. Imprescindible para evitar "regalar"
  // sesiones por doble clic / race conditions.
  async registerFromPackage(input) {
    const db = getDb();
    const packageRef = doc(db, "packages", input.packageId);
    const sessionRef = doc(col(COL));

    const result = await runTransaction(db, async (tx) => {
      const pkgSnap = await tx.get(packageRef);
      if (!pkgSnap.exists()) throw new Error("Paquete no existe");
      const pkg = pkgSnap.data() as Omit<Package, "id">;
      if (pkg.status !== "active") throw new Error("Paquete no activo");
      if (pkg.usedSessions >= pkg.totalSessions) throw new Error("Paquete agotado");

      const nextUsed = pkg.usedSessions + 1;
      const nextStatus = nextUsed >= pkg.totalSessions ? "completed" : "active";

      tx.set(sessionRef, {
        ...input,
        sessionNumber: nextUsed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.update(packageRef, {
        usedSessions: nextUsed,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      return { sessionId: sessionRef.id, sessionNumber: nextUsed };
    });

    const created = await getOne<Session>(COL, result.sessionId);
    if (!created) throw new Error("No se pudo leer la sesión creada");
    return created;
  },

  async listByDateRange(fromIso, toIso) {
    const snap = await getDocs(
      query(
        col(COL),
        where("date", ">=", Timestamp.fromDate(new Date(fromIso))),
        where("date", "<=", Timestamp.fromDate(new Date(toIso))),
        orderBy("date", "asc"),
      ),
    );
    return snap.docs.map((d) => fromSnap<Session>(d));
  },

  async listByPatient(patientId) {
    const snap = await getDocs(
      query(col(COL), where("patientId", "==", patientId), orderBy("date", "desc")),
    );
    return snap.docs.map((d) => fromSnap<Session>(d));
  },
};
