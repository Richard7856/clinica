import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Appointment } from "./types";

// El cliente pide una cita desde la app. Se crea el doc de la cita; su ID es
// el contenido del QR que luego escanea el colaborador para asignar los Cisnes.

export async function requestAppointment(input: {
  patientId: string;
  treatmentId: string;
  clinicId?: string;
  startAt: string; // ISO
}): Promise<string> {
  const ref = await addDoc(collection(db, "appointments"), {
    patientId: input.patientId,
    treatmentId: input.treatmentId,
    clinicId: input.clinicId ?? null,
    cabinId: "", // la clínica la asigna después
    staffId: "",
    startAt: input.startAt,
    endAt: input.startAt,
    status: "requested",
    pointsAwarded: false,
    source: "app-cliente",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyAppointments(patientId: string): Promise<Appointment[]> {
  // Solo where (sin orderBy) para no requerir índice compuesto; ordenamos abajo.
  const snap = await getDocs(
    query(collection(db, "appointments"), where("patientId", "==", patientId)),
  );
  const rows = snap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      patientId: a.patientId,
      treatmentId: a.treatmentId ?? "",
      cabinId: a.cabinId ?? "",
      clinicId: a.clinicId ?? undefined,
      startAt:
        typeof a.startAt === "string"
          ? a.startAt
          : a.startAt?.toDate?.().toISOString() ?? "",
      endAt:
        typeof a.endAt === "string"
          ? a.endAt
          : a.endAt?.toDate?.().toISOString() ?? "",
      status: a.status ?? "requested",
      pointsAwarded: Boolean(a.pointsAwarded),
      amountSpent: a.amountSpent,
    };
  });
  return rows.sort((x, y) => y.startAt.localeCompare(x.startAt));
}

// Estados en los que una cita sigue "viva" y su QR aún sirve.
const ACTIVAS = ["requested", "scheduled", "confirmed"];

// La próxima cita del cliente: la más cercana en el futuro que siga activa.
// `listMyAppointments` devuelve descendente, así que aquí reordenamos.
export function pickNextAppointment(
  appts: Appointment[],
  ahora = new Date(),
): Appointment | null {
  const futuras = appts
    .filter((a) => ACTIVAS.includes(a.status) && !a.pointsAwarded)
    .filter((a) => a.startAt && new Date(a.startAt).getTime() >= ahora.getTime())
    .sort((x, y) => x.startAt.localeCompare(y.startAt));
  return futuras[0] ?? null;
}
