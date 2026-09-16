import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { RewardItem } from "./types";

// Canje de una recompensa por Cisnes.
//
// El cliente APARTA el canje; los Cisnes se descuentan cuando la clínica lo
// entrega (ver el panel de Canjes). Antes se descontaban aquí mismo, desde el
// teléfono, lo que tenía dos problemas: la app podía escribir el saldo del
// paciente —y por tanto cualquiera podía asignarse Cisnes— y el cliente perdía
// los puntos aunque nunca pasara a recoger su recompensa.

export interface RedeemResult {
  code: string; // código corto que el cliente muestra en recepción
}

export async function redeemReward(
  patientId: string,
  item: RewardItem,
): Promise<RedeemResult> {
  if (item.cost <= 0) throw new Error("Recompensa inválida");

  const redemptionRef = doc(collection(db, "redemptions"));
  // Código legible derivado del id del doc (para mostrar en la clínica).
  const code = redemptionRef.id.slice(-6).toUpperCase();

  // El costo lo validan las reglas contra el catálogo: no lo decide la app.
  await setDoc(redemptionRef, {
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

  return { code };
}
