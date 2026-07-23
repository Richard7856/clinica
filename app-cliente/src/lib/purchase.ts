import {
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "./types";

// ⚠️ SIMULACIÓN de compra — MODO DEMO.
// NO cobra de verdad ni usa pasarela de pago. Registra el pago y suma los
// Cisnes localmente para mostrar el flujo completo en la demostración.
//
// Cuando se conecte la pasarela real, esto se reemplaza por el checkout de
// Stripe (ver src/lib/checkout.ts y /api/checkout en el backend).

export async function simulatePurchase(
  product: Product,
  patientId: string,
): Promise<{ earned: number }> {
  const settingsSnap = await getDoc(doc(db, "settings", "clinic"));
  const rate = Number(settingsSnap.data()?.pointsRate ?? 0);
  const earned = Math.floor(product.price * rate);

  const patientRef = doc(db, "patients", patientId);
  const paymentRef = doc(collection(db, "payments"));
  const rewardRef = doc(collection(db, "rewards"));

  await runTransaction(db, async (tx) => {
    const p = await tx.get(patientRef);
    if (!p.exists()) throw new Error("No encontramos tu ficha");

    const now = new Date().toISOString();
    tx.set(paymentRef, {
      patientId,
      amount: product.price,
      method: "card",
      concept: "product",
      refId: product.id,
      date: now,
      receivedBy: "app-demo",
      notes: "Compra simulada desde la app (demo)",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (earned > 0) {
      tx.update(patientRef, {
        points: increment(earned),
        updatedAt: serverTimestamp(),
      });
      tx.set(rewardRef, {
        patientId,
        type: "earned",
        points: earned,
        reason: `Compra: ${product.name}`,
        refId: paymentRef.id,
        date: now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  return { earned };
}
