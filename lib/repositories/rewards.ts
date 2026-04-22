import {
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  increment,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Reward, RewardInput } from "@/lib/schemas/reward";
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

const COL = "rewards";

export interface RewardsRepository extends Repository<RewardInput, Reward> {
  listByPatient(patientId: string): Promise<Reward[]>;
  // Suma/resta puntos y crea el movimiento en una transacción atómica,
  // manteniendo sincronizado patients/{id}.points.
  earn(patientId: string, points: number, reason: string, refId?: string): Promise<void>;
  redeem(patientId: string, points: number, reason: string, refId?: string): Promise<void>;
}

export const rewardsRepo: RewardsRepository = {
  list: () => listAll<Reward>(COL),
  getById: (id) => getOne<Reward>(COL, id),
  create: (input) => createDoc<Reward>(COL, input as Record<string, unknown>),
  update: (id, patch) => updateDocById(COL, id, patch),
  remove: (id) => removeDoc(COL, id),

  async listByPatient(patientId) {
    const snap = await getDocs(
      query(col(COL), where("patientId", "==", patientId), orderBy("date", "desc")),
    );
    return snap.docs.map((d) => fromSnap<Reward>(d));
  },

  async earn(patientId, points, reason, refId) {
    await applyPoints(patientId, points, "earned", reason, refId);
  },
  async redeem(patientId, points, reason, refId) {
    await applyPoints(patientId, points, "redeemed", reason, refId);
  },
};

async function applyPoints(
  patientId: string,
  points: number,
  type: "earned" | "redeemed",
  reason: string,
  refId?: string,
) {
  if (points <= 0) throw new Error("points debe ser positivo");
  const db = getDb();
  const patientRef = doc(db, "patients", patientId);
  const rewardRef = doc(col(COL));
  await runTransaction(db, async (tx) => {
    const p = await tx.get(patientRef);
    if (!p.exists()) throw new Error("Paciente no existe");
    const delta = type === "earned" ? points : -points;
    const current = (p.data().points as number | undefined) ?? 0;
    if (current + delta < 0) throw new Error("Puntos insuficientes");
    tx.update(patientRef, { points: increment(delta), updatedAt: serverTimestamp() });
    tx.set(rewardRef, {
      patientId,
      type,
      points,
      reason,
      refId: refId ?? null,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
