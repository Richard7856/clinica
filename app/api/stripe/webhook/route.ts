import { NextRequest } from "next/server";
import Stripe from "stripe";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

// Webhook de Stripe. Al confirmarse un pago (checkout.session.completed):
//   1. Registra el pago en `payments` (vinculado al paciente y producto).
//   2. Suma Cisnes al paciente según pointsRate, en transacción atómica
//      (mismo criterio que la clínica: floor(monto * pointsRate)).
//
// Requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET. La verificación de firma
// usa el cuerpo CRUDO (req.text()), no JSON parseado.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) {
    return Response.json({ error: "Stripe no configurado" }, { status: 503 });
  }
  const stripe = new Stripe(key);

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", whSecret);
  } catch (err) {
    return Response.json(
      { error: `Firma inválida: ${err instanceof Error ? err.message : ""}` },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const patientId = session.metadata?.patientId;
  const productId = session.metadata?.productId;
  const amount = (session.amount_total ?? 0) / 100; // MXN
  if (!patientId || amount <= 0) {
    return Response.json({ received: true, skipped: "sin metadata" });
  }

  const db = getAdminDb();

  // Idempotencia: no procesar dos veces el mismo evento de Stripe.
  const eventRef = db.collection("stripeEvents").doc(event.id);
  const already = await eventRef.get();
  if (already.exists) {
    return Response.json({ received: true, duplicate: true });
  }

  // pointsRate para calcular los Cisnes ganados.
  const settingsSnap = await db.collection("settings").doc("clinic").get();
  const rate = Number(settingsSnap.data()?.pointsRate ?? 0);
  const earned = Math.floor(amount * rate);

  const patientRef = db.collection("patients").doc(patientId);
  const paymentRef = db.collection("payments").doc();
  const rewardRef = db.collection("rewards").doc();

  await db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    // 1. Registro del pago
    tx.set(paymentRef, {
      patientId,
      amount,
      method: "card",
      concept: "product",
      refId: productId ?? null,
      date: now,
      receivedBy: "app-cliente",
      notes: "Compra desde la app (Stripe)",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    // 2. Puntos ganados
    if (earned > 0) {
      tx.update(patientRef, {
        points: FieldValue.increment(earned),
        updatedAt: Timestamp.now(),
      });
      tx.set(rewardRef, {
        patientId,
        type: "earned",
        points: earned,
        reason: "Compra en la app",
        refId: paymentRef.id,
        date: now,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    // 3. Marca de idempotencia
    tx.set(eventRef, { type: event.type, processedAt: Timestamp.now() });
  });

  return Response.json({ received: true, earned });
}
