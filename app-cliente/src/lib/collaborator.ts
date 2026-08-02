import {
  doc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { cisnesForAmount } from "./types";
import type { Appointment, Patient } from "./types";

// Cita del día enriquecida con datos del cliente (para la lista del colaborador).
export interface TodayVisit {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPoints: number;
  treatmentName: string;
  clinicName: string;
  startAt: string;
  status: string;
  pointsAwarded: boolean;
}

function toIso(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v)
    return (v as { toDate: () => Date }).toDate().toISOString();
  return "";
}
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lista las citas de HOY (día local) con nombre del cliente, tratamiento y clínica.
export async function listTodayVisits(): Promise<TodayVisit[]> {
  const [aptSnap, patSnap, trSnap, clSnap] = await Promise.all([
    getDocs(collection(db, "appointments")),
    getDocs(collection(db, "patients")),
    getDocs(collection(db, "treatments")),
    getDocs(collection(db, "clinics")),
  ]);
  const patients = new Map(patSnap.docs.map((d) => [d.id, d.data()]));
  const treatments = new Map(trSnap.docs.map((d) => [d.id, (d.data().name as string) ?? ""]));
  const clinics = new Map(clSnap.docs.map((d) => [d.id, (d.data().name as string) ?? ""]));
  const today = localDay(new Date());

  const rows: TodayVisit[] = [];
  for (const d of aptSnap.docs) {
    const a = d.data();
    const startAt = toIso(a.startAt);
    if (!startAt) continue;
    if (localDay(new Date(startAt)) !== today) continue;
    const p = patients.get(a.patientId) ?? {};
    rows.push({
      id: d.id,
      patientId: a.patientId ?? "",
      patientName: (p.fullName as string) ?? "—",
      patientEmail: (p.email as string) ?? "",
      patientPoints: typeof p.points === "number" ? p.points : 0,
      treatmentName: treatments.get(a.treatmentId) ?? "Tratamiento",
      clinicName: clinics.get(a.clinicId) ?? "",
      startAt,
      status: a.status ?? "requested",
      pointsAwarded: Boolean(a.pointsAwarded),
    });
  }
  return rows.sort((x, y) => x.startAt.localeCompare(y.startAt));
}

// Panel colaborador: escanea el QR de una cita y asigna los Cisnes.
// Los puntos SOLO se otorgan por esta vía (escaneo del colaborador).

export interface ScannedVisit {
  appointment: Appointment;
  patient: Patient;
  alreadyAwarded: boolean;
}

// Lee la cita y su paciente a partir del contenido del QR (el id de la cita).
export async function lookupAppointment(appointmentId: string): Promise<ScannedVisit> {
  const aptSnap = await getDoc(doc(db, "appointments", appointmentId));
  if (!aptSnap.exists()) throw new Error("Cita no encontrada");
  const a = aptSnap.data();
  const appointment: Appointment = {
    id: aptSnap.id,
    patientId: a.patientId,
    treatmentId: a.treatmentId,
    cabinId: a.cabinId,
    clinicId: a.clinicId,
    startAt: typeof a.startAt === "string" ? a.startAt : a.startAt?.toDate?.().toISOString() ?? "",
    endAt: typeof a.endAt === "string" ? a.endAt : a.endAt?.toDate?.().toISOString() ?? "",
    status: a.status ?? "scheduled",
    pointsAwarded: Boolean(a.pointsAwarded),
    amountSpent: a.amountSpent,
  };

  const pSnap = await getDoc(doc(db, "patients", appointment.patientId));
  if (!pSnap.exists()) throw new Error("Paciente de la cita no existe");
  const p = pSnap.data();
  const patient: Patient = {
    id: pSnap.id,
    fullName: p.fullName ?? "",
    email: p.email ?? "",
    phone: p.phone,
    qrSlug: p.qrSlug ?? "",
    points: typeof p.points === "number" ? p.points : 0,
  };

  return { appointment, patient, alreadyAwarded: Boolean(appointment.pointsAwarded) };
}

// Asigna los Cisnes por la visita, según el monto gastado y la config vigente.
// Transacción: evita doble asignación aunque se escanee dos veces.
export async function awardVisitPoints(
  appointmentId: string,
  amountSpent: number,
): Promise<{ earned: number }> {
  if (amountSpent <= 0) throw new Error("El monto debe ser mayor a 0");

  const cfgSnap = await getDoc(doc(db, "settings", "clinic"));
  const cfg = cfgSnap.exists() ? cfgSnap.data() : {};
  const earned = cisnesForAmount(amountSpent, cfg);

  const aptRef = doc(db, "appointments", appointmentId);
  const rewardRef = doc(collection(db, "rewards"));

  await runTransaction(db, async (tx) => {
    const aptSnap = await tx.get(aptRef);
    if (!aptSnap.exists()) throw new Error("Cita no encontrada");
    const apt = aptSnap.data();
    if (apt.pointsAwarded) throw new Error("Esta cita ya tiene Cisnes asignados");

    const patientRef = doc(db, "patients", apt.patientId);
    const pSnap = await tx.get(patientRef);
    if (!pSnap.exists()) throw new Error("Paciente no existe");

    tx.update(aptRef, {
      pointsAwarded: true,
      amountSpent,
      status: "completed",
      updatedAt: serverTimestamp(),
    });
    if (earned > 0) {
      tx.update(patientRef, {
        points: increment(earned),
        updatedAt: serverTimestamp(),
      });
      tx.set(rewardRef, {
        patientId: apt.patientId,
        type: "earned",
        points: earned,
        reason: "Visita a la clínica",
        refId: appointmentId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  return { earned };
}
