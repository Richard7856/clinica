import "server-only";
import QRCode from "qrcode";

// Genera el QR del paciente server-side para incrustarlo en correos.
// Codifica el mismo `qrSlug` que escanea /checkin — debe coincidir con lo que
// genera la ficha del paciente (app/(app)/patients/[id]/page.tsx).

// PNG como Buffer, para adjuntar al correo.
export async function qrPngBuffer(slug: string): Promise<Buffer> {
  return QRCode.toBuffer(slug, { width: 320, margin: 1, type: "png" });
}

// Data URL (base64) por si se quiere incrustar inline en el HTML.
export async function qrDataUrl(slug: string): Promise<string> {
  return QRCode.toDataURL(slug, { width: 320, margin: 1 });
}
