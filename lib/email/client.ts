import "server-only";
import { Resend } from "resend";

// Cliente Resend singleton. Solo se usa server-side (server actions y route
// handlers). La API key vive en RESEND_API_KEY; el remitente en EMAIL_FROM.
//
// Si las variables no están configuradas, el envío se omite silenciosamente
// (devolvemos { skipped: true }) en vez de romper el flujo de negocio: crear
// un paciente o completar una sesión NO debe fallar porque el correo no salga.

let cached: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Resend(key);
  return cached;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "ClinicaApp <onboarding@resend.dev>";

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  // contentId: si se define, el adjunto queda inline y se referencia con
  // `cid:<contentId>` en el HTML (más confiable que data URLs en Gmail).
  attachments?: { filename: string; content: Buffer; contentId?: string }[];
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendArgs): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY no configurada" };
  }
  if (!to) {
    return { ok: false, skipped: true, reason: "destinatario sin email" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentId ? { contentId: a.contentId } : {}),
      })),
    });
    if (error) {
      return { ok: false, skipped: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : "error desconocido",
    };
  }
}
