// Horarios de atención y generación de espacios (slots) para agendar.
// Los horarios viven en settings/clinic.horarios: [{ dia, h }] donde `h` es
// "10:00 – 19:00" o "Cerrado".

import type { Horario, HorariosClinica, RecursoTratamiento } from "./types";

export type { Horario };

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
export function rango(h: string): { desde: number; hasta: number } | null {
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
  // Ventana propia del tratamiento: se cruza con la del día, nunca la amplía.
  ventana?: string,
): string[] {
  const h = horarioDe(date, horarios);
  if (!h) return [];
  const base = rango(h.h);
  if (!base) return [];

  const r = ventana ? cruzar(base, rango(ventana)) : base;
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

// ---------- Etiquetas de fecha ----------
// OJO: todo se compara en día LOCAL (getFullYear/getMonth/getDate), nunca en
// UTC. Comparar en UTC hacía desaparecer las citas de la tarde en México.

export function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "Hoy" / "Mañana" / "Viernes 5 de sep" — lo que el cliente lee de un vistazo.
export function etiquetaDia(date: Date, hoy = new Date()): string {
  if (esMismoDia(date, hoy)) return "Hoy";
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  if (esMismoDia(date, manana)) return "Mañana";

  const txt = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// "4:00 pm" en minúsculas, como se escribe en español.
export function etiquetaHora(date: Date): string {
  return date
    .toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s*a\.?\s*m\.?/i, " am")
    .replace(/\s*p\.?\s*m\.?/i, " pm");
}


// Horario que aplica a un tratamiento en una sucursal: el de la doctora si el
// tratamiento la necesita, el de los aparatos si no. Sin horarios propios, la
// sucursal cae en el general de la clínica.
export function horariosDe(
  clinica: { horarios?: HorariosClinica } | null | undefined,
  recurso: RecursoTratamiento | undefined,
  general: Horario[],
): Horario[] {
  const h = clinica?.horarios;
  if (!h) return general;
  const lista = recurso === "doctora" ? h.doctora : h.aparato;
  return Array.isArray(lista) && lista.length > 0 ? lista : general;
}


// Intersección de dos rangos de minutos. null si no se tocan.
export function cruzar(
  a: { desde: number; hasta: number },
  b: { desde: number; hasta: number } | null,
): { desde: number; hasta: number } | null {
  if (!b) return a;
  const desde = Math.max(a.desde, b.desde);
  const hasta = Math.min(a.hasta, b.hasta);
  return hasta > desde ? { desde, hasta } : null;
}

// Sucursales que solo se visitan en fechas puntuales: el horario del día sale
// de la lista de visitas, no del calendario semanal.
export function horarioDeVisita(
  date: Date,
  visitas: { fecha: string; h: string }[] | undefined,
): Horario | null {
  if (!visitas?.length) return null;
  const clave = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const v = visitas.find((x) => x.fecha === clave);
  return v ? { dia: clave, h: v.h } : null;
}

// Espacios de un día en una sucursal por visita.
export function slotsDeVisita(
  date: Date,
  visitas: { fecha: string; h: string }[] | undefined,
  duracionMin = 30,
  pasoMin = 30,
  ventana?: string,
): string[] {
  const h = horarioDeVisita(date, visitas);
  if (!h) return [];
  // Reutiliza la misma lógica pasando ese único día como su propio horario.
  const DIAS_NOMBRE = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return slotsDelDia(date, [{ dia: DIAS_NOMBRE[date.getDay()], h: h.h }], duracionMin, pasoMin, ventana);
}
