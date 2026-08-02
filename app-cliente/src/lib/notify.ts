// Dispara el envío del correo con el QR de la cita, vía el backend (Vercel).
// Best-effort: si falla (backend/env/Resend), no interrumpe el flujo del cliente.

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export async function sendAppointmentQrEmail(appointmentId: string): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/email/appointment-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
  } catch {
    // silencioso: el correo es un extra, no bloquea pedir la cita
  }
}
