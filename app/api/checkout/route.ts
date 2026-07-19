import { NextRequest } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase/admin";

// Crea una sesión de Stripe Checkout para comprar un producto/paquete desde la
// app cliente. La app manda { productId, patientId }; el backend RELEE el
// precio real del producto en Firestore (no confía en la app) y crea la sesión.
//
// El pago se confirma en /api/stripe/webhook, que registra el pago y suma los
// Cisnes. Requiere STRIPE_SECRET_KEY en el entorno.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json(
      { error: "Pagos no configurados (falta STRIPE_SECRET_KEY)" },
      { status: 503 },
    );
  }
  const stripe = new Stripe(key);

  let body: { productId?: string; patientId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "body inválido" }, { status: 400 });
  }
  if (!body.productId || !body.patientId) {
    return Response.json(
      { error: "Faltan productId o patientId" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const snap = await db.collection("products").doc(body.productId).get();
  if (!snap.exists) {
    return Response.json({ error: "Producto no existe" }, { status: 404 });
  }
  const p = snap.data()!;
  const priceMxn = Number(p.price);
  if (!Number.isFinite(priceMxn) || priceMxn <= 0) {
    return Response.json({ error: "Precio inválido" }, { status: 400 });
  }

  // Deep link de regreso a la app (esquema "lecrobelle://").
  const appScheme = process.env.APP_DEEP_LINK ?? "lecrobelle://";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(priceMxn * 100), // centavos
          product_data: {
            name: (p.name as string) ?? "Servicio",
            description: (p.description as string) ?? undefined,
          },
        },
      },
    ],
    metadata: {
      productId: body.productId,
      patientId: body.patientId,
    },
    success_url: `${appScheme}pago?estado=ok`,
    cancel_url: `${appScheme}pago?estado=cancelado`,
  });

  return Response.json({ url: session.url });
}
