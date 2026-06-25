import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendReminderEmail } from "@/app/actions/emails";

// Recordatorios de cita — se ejecuta una vez al día vía Vercel Cron.
// Busca las citas activas que empiezan "mañana" (siguiente día calendario en
// la zona horaria de la clínica) y envía un correo a cada paciente con email.
//
// Protegido por CRON_SECRET: Vercel Cron envía el header
// `Authorization: Bearer <CRON_SECRET>`. Sin él, 401.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIVE = ["scheduled", "confirmed"];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const db = getAdminDb();

  // Config de la clínica (nombre + timezone para etiquetar la fecha).
  const clinicSnap = await db.collection("settings").doc("clinic").get();
  const clinicName = (clinicSnap.data()?.name as string) || "ClinicaApp";
  const timeZone =
    (clinicSnap.data()?.timezone as string) || "America/Mexico_City";

  // Ventana [inicio de mañana, fin de mañana) en la zona de la clínica.
  const { startUtc, endUtc } = tomorrowRange(timeZone);

  // Solo rango sobre startAt (un campo → sin índice compuesto). El status se
  // filtra en memoria; son las citas de un único día, volumen trivial.
  const rangeSnap = await db
    .collection("appointments")
    .where("startAt", ">=", Timestamp.fromDate(startUtc))
    .where("startAt", "<", Timestamp.fromDate(endUtc))
    .get();
  const docs = rangeSnap.docs.filter((d) =>
    ACTIVE.includes(d.data().status as string),
  );

  const results = { found: docs.length, sent: 0, skipped: 0, failed: 0 };

  // Cachés para no releer paciente/tratamiento repetidos.
  const patientCache = new Map<string, Record<string, unknown> | null>();
  const treatmentCache = new Map<string, string | undefined>();

  for (const docSnap of docs) {
    const apt = docSnap.data();
    const patientId = apt.patientId as string;
    const treatmentId = apt.treatmentId as string | undefined;

    let patient = patientCache.get(patientId);
    if (patient === undefined) {
      const p = await db.collection("patients").doc(patientId).get();
      patient = p.exists ? p.data()! : null;
      patientCache.set(patientId, patient);
    }
    if (!patient || !patient.email) {
      results.skipped++;
      continue;
    }

    let treatmentName: string | undefined;
    if (treatmentId) {
      if (treatmentCache.has(treatmentId)) {
        treatmentName = treatmentCache.get(treatmentId);
      } else {
        const t = await db.collection("treatments").doc(treatmentId).get();
        treatmentName = (t.data()?.name as string) || undefined;
        treatmentCache.set(treatmentId, treatmentName);
      }
    }

    const startAt = (apt.startAt as Timestamp).toDate();
    const dateLabel = formatDate(startAt, timeZone);
    const timeLabel = formatTime(startAt, timeZone);

    const res = await sendReminderEmail({
      to: patient.email as string,
      clinicName,
      patientName: (patient.fullName as string) ?? "",
      treatmentName,
      dateLabel,
      timeLabel,
    });

    if (res.ok) results.sent++;
    else if (res.skipped) results.skipped++;
    else results.failed++;
  }

  return Response.json({ ok: true, ...results });
}

// ─── helpers de fecha (timezone-aware sin librerías extra) ───────────────────

// Devuelve el rango UTC que corresponde al día calendario "mañana" en `tz`.
function tomorrowRange(tz: string): { startUtc: Date; endUtc: Date } {
  const now = new Date();
  // Fecha (Y-M-D) de hoy en la zona de la clínica.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);

  // Mañana a medianoche y pasado a medianoche, en hora local de la clínica,
  // convertidos a UTC restando el offset de la zona.
  const startLocalMidnight = zonedMidnightToUtc(y, m, d + 1, tz);
  const endLocalMidnight = zonedMidnightToUtc(y, m, d + 2, tz);
  return { startUtc: startLocalMidnight, endUtc: endLocalMidnight };
}

// Convierte "medianoche del Y-M-D en tz" a un Date UTC correcto.
function zonedMidnightToUtc(y: number, m: number, d: number, tz: string): Date {
  // Date.UTC con los componentes da un instante; calculamos el offset real de
  // la zona en ese instante y lo restamos para obtener la medianoche local.
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const asInTz = new Date(guess.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = asUtc.getTime() - asInTz.getTime();
  return new Date(guess.getTime() + offset);
}

function formatDate(date: Date, tz: string): string {
  // ej. "martes 24 de junio"
  const label = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return `mañana ${label}`;
}

function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
