// Catálogo público de la clínica: tratamientos, sucursales, promociones y
// horarios. Lo consumen Inicio y Cita, así que vive aquí y no dentro de una
// pantalla — antes cada una hacía su propio mapeo de los docs de Firestore.

import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Treatment, Clinic, Promotion } from "./types";
import { HORARIOS_DEFAULT, type Horario } from "./schedule";

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
      active: Boolean(d.active),
    };
  });
}

// Solo `where` (sin orderBy) para no exigir un índice compuesto; el orden se
// resuelve en memoria — el catálogo de promos es de decenas, no de miles.
export async function listActivePromotions(): Promise<Promotion[]> {
  const snap = await getDocs(
    query(collection(db, "promotions"), where("active", "==", true)),
  );
  return snap.docs
    .map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: (d.title as string) ?? "",
        description: (d.description as string) ?? "",
        badge: d.badge as string | undefined,
        active: true,
        createdAt: d.createdAt as string | undefined,
      };
    })
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
