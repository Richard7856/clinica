import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { RewardItem } from "./types";

// Canje de una recompensa por Cisnes. Replica el mecanismo de la clínica
// (lib/repositories/rewards.ts → applyPoints): transacción atómica que
// descuenta puntos del paciente y registra el movimiento, evitando saldos
// negativos por doble toque / carreras.
//
// Además crea un doc en `redemptions` (estado "pending") para que la clínica
// vea el canje y lo honre en recepción. El ledger `rewards` queda ligado por
// refId a ese canje.

export interface RedeemResult {
  code: string; // código corto que el cliente muestra en recepción
}

export async function redeemReward(
  patientId: string,
  item: RewardItem,
): Promise<RedeemResult> {
  if (item.cost <= 0) throw new Error("Recompensa inválida");

  const patientRef = doc(db, "patients", patientId);
  const redemptionRef = doc(collection(db, "redemptions"));
  const rewardRef = doc(collection(db, "rewards"));

  // Código legible derivado del id del doc (para mostrar en la clínica).
  const code = redemptionRef.id.slice(-6).toUpperCase();

  await runTransaction(db, async (tx) => {
    const p = await tx.get(patientRef);
    if (!p.exists()) throw new Error("No encontramos tu ficha");
    const current = (p.data().points as number | undefined) ?? 0;
    if (current < item.cost) throw new Error("Cisnes insuficientes");

    // 1. Descontar puntos
    tx.update(patientRef, {
      points: increment(-item.cost),
      updatedAt: serverTimestamp(),
    });

    // 2. Registro de canje que la clínica honra en recepción
    tx.set(redemptionRef, {
      patientId,
      rewardItemId: item.id,
      title: item.title,
      cost: item.cost,
      code,
      status: "pending",
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. Movimiento en el ledger de puntos (mismo formato que la clínica)
    tx.set(rewardRef, {
      patientId,
      type: "redeemed",
      points: item.cost,
      reason: `Canje: ${item.title}`,
      refId: redemptionRef.id,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return { code };
}
