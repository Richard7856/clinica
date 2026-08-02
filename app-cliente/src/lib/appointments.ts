import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
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
  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("patientId", "==", patientId),
      orderBy("startAt", "desc"),
    ),
  );
  return snap.docs.map((d) => {
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
}
