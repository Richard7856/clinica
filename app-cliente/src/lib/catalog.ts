// Catálogo público de la clínica: tratamientos, sucursales, promociones y
// horarios. Lo consumen Inicio y Cita, así que vive aquí y no dentro de una
// pantalla — antes cada una hacía su propio mapeo de los docs de Firestore.

import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Treatment, Clinic, Promotion, HorariosClinica, Horario } from "./types";
import { mapPromotion, promoVigente } from "./types";
import { HORARIOS_DEFAULT } from "./schedule";

export async function listTreatments(): Promise<Treatment[]> {
  const snap = await getDocs(collection(db, "treatments"));
  return snap.docs
    .map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: (d.name as string) ?? "",
        category: (d.category as Treatment["category"]) ?? "facial",
        price: typeof d.price === "number" ? d.price : 0,
        priceMax: typeof d.priceMax === "number" ? d.priceMax : undefined,
        priceNote: d.priceNote as string | undefined,
        durationMin: d.durationMin as number | undefined,
        requires: (d.requires as Treatment["requires"]) ?? "aparato",
        clinicIds: Array.isArray(d.clinicIds) ? (d.clinicIds as string[]) : [],
        cabins: (d.cabins as Record<string, string>) ?? undefined,
        active: d.active !== false,
      };
    })
    .filter((t) => t.active);
}

export async function listClinics(): Promise<Clinic[]> {
  const snap = await getDocs(collection(db, "clinics"));
  return snap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      name: (d.name as string) ?? "",
      address: d.address as string | undefined,
      phone: d.phone as string | undefined,
      horarios: leerHorarios(d.horarios),
      active: Boolean(d.active),
    };
  });
}

// Los horarios por sucursal traen dos listas; si el documento no las tiene
// (sucursal vieja), se devuelve undefined y se usa el horario general.
function leerHorarios(v: unknown): HorariosClinica | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as { aparato?: unknown; doctora?: unknown };
  const lista = (x: unknown): Horario[] =>
    Array.isArray(x) ? (x as Horario[]).filter((h) => h && typeof h.dia === "string") : [];
  const aparato = lista(o.aparato);
  const doctora = lista(o.doctora);
  if (aparato.length === 0 && doctora.length === 0) return undefined;
  return { aparato, doctora };
}

// Solo `where` (sin orderBy) para no exigir un índice compuesto; el orden se
// resuelve en memoria — el catálogo de promos es de decenas, no de miles.
export async function listActivePromotions(): Promise<Promotion[]> {
  const snap = await getDocs(
    query(collection(db, "promotions"), where("active", "==", true)),
  );
  return snap.docs
    .map((d) => mapPromotion(d.id, d.data() as Record<string, unknown>))
    // Una promoción vencida deja de verse sola, sin que nadie la apague.
    .filter((p) => promoVigente(p))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function loadHorarios(): Promise<Horario[]> {
  try {
    const snap = await getDoc(doc(db, "settings", "clinic"));
    const hs = snap.exists() ? snap.data().horarios : null;
    if (Array.isArray(hs) && hs.length > 0) return hs as Horario[];
  } catch {
    // sin conexión o sin permisos: usamos el horario por defecto
  }
  return HORARIOS_DEFAULT;
}

// Índice id → nombre, para resolver el tratamiento/sucursal de una cita sin
// volver a Firestore por cada tarjeta.
export function nombrePorId<T extends { id: string; name: string }>(
  rows: T[],
): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

// Traduce el fallo de una lectura a algo accionable. Un catálogo vacío y un
// catálogo denegado se ven igual en pantalla, y no son lo mismo: el primero
// se arregla creando datos, el segundo desplegando reglas.
export function motivoFallo(razon: unknown): string {
  const code =
    razon && typeof razon === "object" && "code" in razon
      ? String((razon as { code: unknown }).code)
      : "";
  if (code.includes("permission-denied"))
    return "Sin permiso para leer esto (revisa las reglas de Firestore).";
  if (code.includes("unavailable")) return "Sin conexión con el servidor.";
  return "No se pudo cargar.";
}
