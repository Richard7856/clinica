// Horarios de atención y generación de espacios (slots) para agendar.
// Los horarios viven en settings/clinic.horarios: [{ dia, h }] donde `h` es
// "10:00 – 19:00" o "Cerrado".

export interface Horario {
  dia: string;
  h: string;
}

export const HORARIOS_DEFAULT: Horario[] = [
  { dia: "Lunes", h: "10:00 – 19:00" },
  { dia: "Martes", h: "10:00 – 19:00" },
  { dia: "Miércoles", h: "09:00 – 18:00" },
  { dia: "Jueves", h: "10:00 – 19:00" },
  { dia: "Viernes", h: "09:00 – 18:00" },
  { dia: "Sábado", h: "09:00 – 13:00" },
  { dia: "Domingo", h: "Cerrado" },
];

// getDay(): 0=domingo. Nombres tal como se guardan en settings.
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function normaliza(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function horarioDe(date: Date, horarios: Horario[]): Horario | null {
  const nombre = normaliza(DIAS[date.getDay()]);
  return horarios.find((h) => normaliza(h.dia) === nombre) ?? null;
}

// "10:00 – 19:00" → { desde: 600, hasta: 1140 } en minutos. null si cerrado.
function rango(h: string): { desde: number; hasta: number } | null {
  const m = h.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const desde = Number(m[1]) * 60 + Number(m[2]);
  const hasta = Number(m[3]) * 60 + Number(m[4]);
  return hasta > desde ? { desde, hasta } : null;
}

export function esCerrado(date: Date, horarios: Horario[]): boolean {
  const h = horarioDe(date, horarios);
  return !h || !rango(h.h);
}

// Espacios disponibles ese día, cada `pasoMin` (30 por defecto). El último
// espacio deja lugar para que la cita termine dentro del horario.
// Para HOY se descartan los que ya pasaron.
export function slotsDelDia(
  date: Date,
  horarios: Horario[],
  duracionMin = 30,
  pasoMin = 30,
): string[] {
  const h = horarioDe(date, horarios);
  if (!h) return [];
  const r = rango(h.h);
  if (!r) return [];

  const hoy = new Date();
  const esHoy =
    date.getFullYear() === hoy.getFullYear() &&
    date.getMonth() === hoy.getMonth() &&
    date.getDate() === hoy.getDate();
  const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();

  const out: string[] = [];
  for (let m = r.desde; m + duracionMin <= r.hasta; m += pasoMin) {
    if (esHoy && m <= ahoraMin) continue; // ya pasó
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

// Combina un día y un slot "HH:MM" en una fecha local.
export function fechaConSlot(date: Date, slot: string): Date {
  const [hh, mm] = slot.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

// Próximos `n` días a partir de hoy (para el selector de fecha).
export function proximosDias(n: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}
