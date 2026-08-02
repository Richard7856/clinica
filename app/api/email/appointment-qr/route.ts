import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/client";
import { qrPngBuffer } from "@/lib/email/qr";
import { appointmentQrEmail } from "@/lib/email/templates";

// Envía por correo el QR de una cita solicitada desde la app cliente.
// La app llama a este endpoint tras crear la cita: { appointmentId }.
// El QR codifica el ID de la cita (lo mismo que escanea el colaborador).
//
// Requiere FIREBASE_ADMIN_* (del proyecto correcto) y RESEND_API_KEY en el
// entorno. El envío es best-effort: si algo falla, no rompe el flujo.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { appointmentId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "body inválido" }, { status: 400 });
  }
  if (!body.appointmentId) {
    return Response.json({ error: "falta appointmentId" }, { status: 400 });
  }

  const db = getAdminDb();
  const aptSnap = await db.collection("appointments").doc(body.appointmentId).get();
  if (!aptSnap.exists) {
    return Response.json({ error: "cita no existe" }, { status: 404 });
  }
  const apt = aptSnap.data()!;

  const [patSnap, clinicSnap] = await Promise.all([
    db.collection("patients").doc(apt.patientId as string).get(),
    db.collection("settings").doc("clinic").get(),
  ]);
  const patient = patSnap.data();
  if (!patient?.email) {
    return Response.json({ ok: false, skipped: "paciente sin email" });
  }
  const clinicName = (clinicSnap.data()?.name as string) || "L'Ecrobelle";

  let treatmentName: string | undefined;
  if (apt.treatmentId) {
    const t = await db.collection("treatments").doc(apt.treatmentId as string).get();
    treatmentName = (t.data()?.name as string) || undefined;
  }

  // Fecha legible (startAt puede venir como string ISO o Timestamp)
  let dateLabel: string | undefined;
  const start = apt.startAt;
  const startDate =
    typeof start === "string"
      ? new Date(start)
      : start?.toDate?.() ?? null;
  if (startDate) {
    dateLabel = startDate.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const png = await qrPngBuffer(body.appointmentId);
  const cid = "qr-cita";
  const { subject, html } = appointmentQrEmail({
    clinicName,
    patientName: (patient.fullName as string) ?? "",
    treatmentName,
    dateLabel,
    qrCid: `cid:${cid}`,
  });

  const res = await sendEmail({
    to: patient.email as string,
    subject,
    html,
    attachments: [{ filename: "qr.png", content: png, contentId: cid }],
  });

  return Response.json(res);
}
