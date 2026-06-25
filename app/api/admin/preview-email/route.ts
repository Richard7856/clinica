import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/client";
import { qrPngBuffer } from "@/lib/email/qr";
import {
  welcomeEmail,
  visitSummaryEmail,
  reminderEmail,
} from "@/lib/email/templates";

// Endpoint TEMPORAL de preview: manda una muestra de los 3 correos al
// destinatario indicado, con datos ficticios, para demos. Protegido por
// CRON_SECRET. Eliminar tras la demo.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  let body: { to?: string; clinicName?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const to = body.to?.trim();
  const clinicName = body.clinicName?.trim() || "ClinicaApp";
  if (!to) return Response.json({ error: "falta 'to'" }, { status: 400 });

  const results: Record<string, unknown> = {};

  // 1. Bienvenida + QR
  const png = await qrPngBuffer("DEMO12345X");
  const welcome = welcomeEmail({
    clinicName,
    patientName: "María Robles",
    qrCid: "cid:qr-demo",
  });
  results.welcome = await sendEmail({
    to,
    subject: `[DEMO] ${welcome.subject}`,
    html: welcome.html,
    attachments: [{ filename: "qr.png", content: png, contentId: "qr-demo" }],
  });

  // 2. Resumen de visita
  const visit = visitSummaryEmail({
    clinicName,
    patientName: "María Robles",
    treatmentName: "Depilación láser",
    points: 1250,
    pointsEarned: 500,
    packageName: "Depilación láser",
    sessionsRemaining: 2,
    sessionsTotal: 5,
  });
  results.visitSummary = await sendEmail({
    to,
    subject: `[DEMO] ${visit.subject}`,
    html: visit.html,
  });

  // 3. Recordatorio de cita
  const reminder = reminderEmail({
    clinicName,
    patientName: "María Robles",
    treatmentName: "Depilación láser",
    dateLabel: "mañana martes 26 de junio",
    timeLabel: "10:00",
  });
  results.reminder = await sendEmail({
    to,
    subject: `[DEMO] ${reminder.subject}`,
    html: reminder.html,
  });

  return Response.json({ ok: true, to, results });
}
