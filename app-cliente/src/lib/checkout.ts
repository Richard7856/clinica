import * as WebBrowser from "expo-web-browser";
import type { Product } from "./types";

// Inicia la compra de un producto. Llama al backend de la clínica (Vercel), que
// crea la sesión de Stripe Checkout, y abre la URL de pago en el navegador
// seguro. El pago se confirma server-side vía webhook (suma los Cisnes).
//
// EXPO_PUBLIC_API_URL debe apuntar al backend, p.ej.
// https://clinica-gold-omega.vercel.app

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export async function startCheckout(
  product: Product,
  patientId: string,
): Promise<void> {
  if (!API_URL) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL");
  }

  const res = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: product.id, patientId }),
  });

  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? "No se pudo iniciar el pago");
  }

  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error("El servidor no devolvió la página de pago");

  // Abre Stripe Checkout; regresa a la app vía el deep link lecrobelle://pago
  await WebBrowser.openAuthSessionAsync(url, "lecrobelle://pago");
}
