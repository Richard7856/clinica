"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { sendEmail, type SendResult } from "@/lib/email/client";
import { qrPngBuffer } from "@/lib/email/qr";
import {
  welcomeEmail,
  visitSummaryEmail,
  reminderEmail,
} from "@/lib/email/templates";

// Server actions de correo. Se invocan desde componentes cliente (alta de
// paciente, check-in) y desde el route handler de recordatorios.
//
// Principio: estas acciones RELEEN los datos con el admin SDK (no confían en lo
// que manda el cliente), de modo que puntos y sesiones restantes en el correo
// siempre reflejen el estado real en Firestore.
//
// Nunca lanzan: devuelven SendResult. El correo es un efecto secundario; si
// falla, el flujo de negocio (crear paciente, completar sesión) ya se completó.

async function getClinicName(): Promise<string> {
  try {
    const snap = await getAdminDb().collection("settings").doc("clinic").get();
    return (snap.data()?.name as string) || "ClinicaApp";
  } catch {
    return "ClinicaApp";
  }
}

interface PatientLite {
  fullName: string;
  email: string;
  qrSlug: string;
  points: number;
}

async function getPatient(patientId: string): Promise<PatientLite | null> {
  const snap = await getAdminDb().collection("patients").doc(patientId).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    qrSlug: (d.qrSlug as string) ?? "",
    points: typeof d.points === "number" ? d.points : 0,
  };
}

// ─── 1. Bienvenida + QR ──────────────────────────────────────────────────────

export async function sendWelcomeEmail(patientId: string): Promise<SendResult> {
  const patient = await getPatient(patientId);
  if (!patient) return { ok: false, skipped: true, reason: "paciente no existe" };
  if (!patient.email)
    return { ok: false, skipped: true, reason: "paciente sin email" };

  const clinicName = await getClinicName();
  const png = await qrPngBuffer(patient.qrSlug);
  const cid = "qr-paciente";

  const { subject, html } = welcomeEmail({
    clinicName,
    patientName: patient.fullName,
    qrCid: `cid:${cid}`,
  });

  return sendEmail({
    to: patient.email,
    subject,
    html,
    attachments: [{ filename: "qr.png", content: png, contentId: cid }],
  });
}

// ─── 2. Resumen de visita (puntos + sesiones restantes) ──────────────────────

export async function sendVisitSummaryEmail(args: {
  patientId: string;
  treatmentId?: string;
  packageId?: string;
  pointsEarned?: number;
}): Promise<SendResult> {
  const { patientId, treatmentId, packageId, pointsEarned } = args;

  const patient = await getPatient(patientId);
  if (!patient) return { ok: false, skipped: true, reason: "paciente no existe" };
  if (!patient.email)
    return { ok: false, skipped: true, reason: "paciente sin email" };

  const db = getAdminDb();
  const clinicName = await getClinicName();

  let treatmentName: string | undefined;
  if (treatmentId) {
    const t = await db.collection("treatments").doc(treatmentId).get();
    treatmentName = (t.data()?.name as string) || undefined;
  }

  let packageName: string | undefined;
  let sessionsRemaining: number | undefined;
  let sessionsTotal: number | undefined;
  if (packageId) {
    const p = await db.collection("packages").doc(packageId).get();
    const pd = p.data();
    if (pd) {
      sessionsTotal = pd.totalSessions as number;
      const used = (pd.usedSessions as number) ?? 0;
      sessionsRemaining = Math.max(0, (sessionsTotal ?? 0) - used);
      // Nombre legible del paquete: tratamiento del paquete o las notas.
      if (pd.treatmentId) {
        const pt = await db.collection("treatments").doc(pd.treatmentId).get();
        packageName = (pt.data()?.name as string) || undefined;
      }
    }
  }

  const { subject, html } = visitSummaryEmail({
    clinicName,
    patientName: patient.fullName,
    treatmentName,
    points: patient.points,
    pointsEarned,
    packageName,
    sessionsRemaining,
    sessionsTotal,
  });

  return sendEmail({ to: patient.email, subject, html });
}

// ─── 3. Recordatorio de cita ─────────────────────────────────────────────────
// Usada por el cron. Recibe los datos ya resueltos para no releer N veces.

export async function sendReminderEmail(args: {
  to: string;
  clinicName: string;
  patientName: string;
  treatmentName?: string;
  dateLabel: string;
  timeLabel: string;
}): Promise<SendResult> {
  const { to, ...rest } = args;
  const { subject, html } = reminderEmail(rest);
  return sendEmail({ to, subject, html });
}
