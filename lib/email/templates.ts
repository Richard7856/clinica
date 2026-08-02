// Plantillas de correo para el paciente, en español. HTML inline-styled para
// máxima compatibilidad con clientes de correo (Gmail, Outlook, Apple Mail).
// Identidad visual de ClinicaApp: azul confianza + papel cálido (ver landing).
//
// El paciente NUNCA entra a la app: estos correos son su único canal para
// recibir su QR, sus puntos y sus sesiones restantes.

const BRAND = "ClinicaApp";
const COLOR_INK = "#2b3340";
const COLOR_SOFT = "#5a6473";
const COLOR_FAINT = "#8a93a3";
const COLOR_PRIMARY_DEEP = "#2f4661";
const COLOR_BG = "#f6f4ef";
const COLOR_SURFACE = "#ffffff";
const COLOR_LINE = "#e4e7ec";

interface Shell {
  title: string;
  clinicName: string;
  body: string;
  preheader?: string;
}

// Esqueleto compartido: header con marca, tarjeta blanca con el contenido,
// y footer. `body` es HTML ya formateado.
function shell({ title, clinicName, body, preheader = "" }: Shell): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR_BG};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 20px;">
        <span style="font-size:20px;font-weight:700;color:${COLOR_PRIMARY_DEEP};letter-spacing:-0.01em;">${escapeHtml(clinicName || BRAND)}</span>
      </td></tr>
      <tr><td style="background:${COLOR_SURFACE};border:1px solid ${COLOR_LINE};border-radius:16px;padding:32px;">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 4px 0;">
        <p style="margin:0;font-size:12px;color:${COLOR_FAINT};line-height:1.5;">
          Este es un correo automático de ${escapeHtml(clinicName || BRAND)}. No es necesario responder.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${COLOR_INK};line-height:1.2;">${escapeHtml(text)}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:${COLOR_SOFT};line-height:1.6;">${text}</p>`;
}

// Caja destacada (para puntos / sesiones restantes).
function statBox(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      (r) => `
      <td align="center" style="padding:16px 12px;">
        <div style="font-size:28px;font-weight:700;color:${COLOR_PRIMARY_DEEP};line-height:1;">${escapeHtml(r.value)}</div>
        <div style="font-size:12px;color:${COLOR_FAINT};margin-top:6px;">${escapeHtml(r.label)}</div>
      </td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR_BG};border-radius:12px;margin:0 0 16px;">
    <tr>${cells}</tr>
  </table>`;
}

// ─── 1. Bienvenida + QR (al alta del paciente) ───────────────────────────────

export interface WelcomeArgs {
  clinicName: string;
  patientName: string;
  qrCid: string; // content-id del adjunto (cid:...) o data URL
}

export function welcomeEmail({ clinicName, patientName, qrCid }: WelcomeArgs): {
  subject: string;
  html: string;
} {
  const subject = `Tu código QR de ${clinicName || BRAND}`;
  const body = `
    ${heading(`¡Bienvenida/o, ${firstName(patientName)}!`)}
    ${para(`Gracias por registrarte en <strong>${escapeHtml(clinicName || BRAND)}</strong>. Este es tu <strong>código QR personal</strong>: preséntalo al llegar a la clínica para registrar tu visita de forma rápida.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
      <tr><td align="center" style="background:${COLOR_BG};border-radius:12px;padding:24px;">
        <img src="${qrCid}" width="220" height="220" alt="Tu código QR" style="display:block;border-radius:8px;background:#fff;padding:8px;" />
      </td></tr>
    </table>
    ${para(`Guarda este correo o toma una captura de pantalla. Cada vez que nos visites, escanearemos tu QR y mantendremos al día tus sesiones y tus puntos.`)}
  `;
  return {
    subject,
    html: shell({
      title: subject,
      clinicName,
      preheader: "Tu código QR personal para registrar tus visitas.",
      body,
    }),
  };
}

// ─── 1b. QR de una cita solicitada ───────────────────────────────────────────

export interface AppointmentQrArgs {
  clinicName: string;
  patientName: string;
  treatmentName?: string;
  dateLabel?: string;
  qrCid: string;
}

export function appointmentQrEmail({
  clinicName,
  patientName,
  treatmentName,
  dateLabel,
  qrCid,
}: AppointmentQrArgs): { subject: string; html: string } {
  const subject = `El QR de tu cita en ${clinicName || BRAND}`;
  const body = `
    ${heading(`¡Tu cita está lista, ${firstName(patientName)}!`)}
    ${para(`Agendamos tu cita${treatmentName ? ` de <strong>${escapeHtml(treatmentName)}</strong>` : ""}${dateLabel ? ` para <strong>${escapeHtml(dateLabel)}</strong>` : ""}. Muestra este <strong>código QR</strong> al llegar: al escanearlo se te asignan tus Cisnes.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
      <tr><td align="center" style="background:${COLOR_BG};border-radius:12px;padding:24px;">
        <img src="${qrCid}" width="220" height="220" alt="QR de tu cita" style="display:block;border-radius:8px;background:#fff;padding:8px;" />
      </td></tr>
    </table>
    ${para(`Guarda este correo o toma una captura. ¡Te esperamos!`)}
  `;
  return {
    subject,
    html: shell({
      title: subject,
      clinicName,
      preheader: "El código QR de tu cita.",
      body,
    }),
  };
}

// ─── 2. Resumen después de la visita (puntos + sesiones restantes) ───────────

export interface VisitSummaryArgs {
  clinicName: string;
  patientName: string;
  treatmentName?: string;
  points: number;
  pointsEarned?: number;
  packageName?: string;
  sessionsRemaining?: number;
  sessionsTotal?: number;
}

export function visitSummaryEmail(args: VisitSummaryArgs): {
  subject: string;
  html: string;
} {
  const {
    clinicName,
    patientName,
    treatmentName,
    points,
    pointsEarned,
    packageName,
    sessionsRemaining,
    sessionsTotal,
  } = args;

  const subject = `Resumen de tu visita a ${clinicName || BRAND}`;

  const stats: { label: string; value: string }[] = [
    { label: "Puntos acumulados", value: String(points) },
  ];
  if (typeof sessionsRemaining === "number") {
    stats.push({
      label: "Sesiones restantes",
      value:
        typeof sessionsTotal === "number"
          ? `${sessionsRemaining}/${sessionsTotal}`
          : String(sessionsRemaining),
    });
  }

  const body = `
    ${heading("¡Gracias por tu visita!")}
    ${para(`Hola ${firstName(patientName)}, registramos tu visita${treatmentName ? ` de <strong>${escapeHtml(treatmentName)}</strong>` : ""}${packageName ? ` del paquete <strong>${escapeHtml(packageName)}</strong>` : ""}. Este es tu resumen actualizado:`)}
    ${statBox(stats)}
    ${pointsEarned && pointsEarned > 0 ? para(`En esta visita sumaste <strong>${pointsEarned} puntos</strong>. ¡Sigue acumulando para canjearlos por beneficios!`) : ""}
    ${typeof sessionsRemaining === "number" && sessionsRemaining === 0 ? para(`Has completado todas las sesiones de tu paquete. ¡Felicidades! Cuando quieras, pregúntanos por tu próximo paquete.`) : ""}
    ${para(`Te esperamos en tu próxima cita. Recuerda traer tu código QR.`)}
  `;
  return {
    subject,
    html: shell({
      title: subject,
      clinicName,
      preheader: `Tienes ${points} puntos${typeof sessionsRemaining === "number" ? ` y ${sessionsRemaining} sesiones restantes` : ""}.`,
      body,
    }),
  };
}

// ─── 3. Recordatorio de cita ─────────────────────────────────────────────────

export interface ReminderArgs {
  clinicName: string;
  patientName: string;
  treatmentName?: string;
  dateLabel: string; // ej. "mañana martes 24 de junio"
  timeLabel: string; // ej. "10:00"
}

export function reminderEmail({
  clinicName,
  patientName,
  treatmentName,
  dateLabel,
  timeLabel,
}: ReminderArgs): { subject: string; html: string } {
  const subject = `Recordatorio de tu cita en ${clinicName || BRAND}`;
  const body = `
    ${heading("Te recordamos tu cita")}
    ${para(`Hola ${firstName(patientName)}, este es un recordatorio de tu próxima cita${treatmentName ? ` de <strong>${escapeHtml(treatmentName)}</strong>` : ""}:`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR_BG};border-radius:12px;margin:0 0 16px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:13px;color:${COLOR_FAINT};">Fecha y hora</div>
        <div style="font-size:18px;font-weight:700;color:${COLOR_PRIMARY_DEEP};margin-top:4px;">${escapeHtml(dateLabel)} · ${escapeHtml(timeLabel)}</div>
      </td></tr>
    </table>
    ${para(`Recuerda traer tu código QR para registrar tu llegada. Si necesitas reprogramar, contáctanos.`)}
  `;
  return {
    subject,
    html: shell({
      title: subject,
      clinicName,
      preheader: `Tu cita es ${dateLabel} a las ${timeLabel}.`,
      body,
    }),
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function firstName(full: string): string {
  return escapeHtml((full || "").trim().split(/\s+/)[0] || "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
