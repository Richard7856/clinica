import {
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { cisnesForAmount } from "./types";
import type { Appointment, Patient } from "./types";

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
