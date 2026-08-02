import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { doc as fbDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type {
  Promotion,
  Device,
  Appointment,
  RewardItem,
  Clinic,
  StoreProduct,
  ClinicInfo,
} from "./types";

// Operaciones del panel admin sobre Firestore. El staff tiene permisos de
// escritura (reglas de la clínica). Todo directo, sin backend intermedio.

// ── Promociones (colección nueva `promotions`) ──────────────────────────────
export async function listPromotions(): Promise<Promotion[]> {
  const snap = await getDocs(collection(db, "promotions"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
}

export async function createPromotion(
  input: Pick<Promotion, "title" | "description" | "badge">,
): Promise<void> {
  await addDoc(collection(db, "promotions"), {
    title: input.title,
    description: input.description,
    badge: input.badge ?? "",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function setPromotionActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "promotions", id), { active, updatedAt: serverTimestamp() });
}

export async function deletePromotion(id: string): Promise<void> {
  await deleteDoc(doc(db, "promotions", id));
}

// ── Aparatos (colección `devices`) ──────────────────────────────────────────
export async function listDevices(): Promise<Device[]> {
  const snap = await getDocs(collection(db, "devices"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) ?? "",
      type: data.type as string | undefined,
      cabinId: data.cabinId as string | undefined,
      clinicId: (data.clinicId as string | undefined) ?? undefined,
      hours: data.hours as string | undefined,
      status: (data.status as Device["status"]) ?? "active",
    };
  });
}

export async function setDeviceStatus(
  id: string,
  status: Device["status"],
): Promise<void> {
  await updateDoc(doc(db, "devices", id), { status, updatedAt: serverTimestamp() });
}

// Asigna clínica y horario a un aparato.
export async function updateDevice(
  id: string,
  patch: Partial<Pick<Device, "clinicId" | "hours" | "name" | "type">>,
): Promise<void> {
  await updateDoc(doc(db, "devices", id), { ...patch, updatedAt: serverTimestamp() });
}

export async function createDevice(
  input: Pick<Device, "name" | "type" | "clinicId" | "hours">,
): Promise<void> {
  await addDoc(collection(db, "devices"), {
    name: input.name,
    type: input.type ?? "",
    clinicId: input.clinicId ?? null,
    hours: input.hours ?? "",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ── Clínicas (multi-clínica ligero) ─────────────────────────────────────────
export async function listClinics(): Promise<Clinic[]> {
  const snap = await getDocs(collection(db, "clinics"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: (x.name as string) ?? "",
      address: x.address as string | undefined,
      phone: x.phone as string | undefined,
      active: x.active !== false,
    };
  });
}

export async function createClinic(
  input: Pick<Clinic, "name" | "address" | "phone">,
): Promise<void> {
  await addDoc(collection(db, "clinics"), {
    name: input.name,
    address: input.address ?? "",
    phone: input.phone ?? "",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClinic(id: string): Promise<void> {
  await deleteDoc(doc(db, "clinics", id));
}

// ── Tienda (productos físicos) ──────────────────────────────────────────────
export async function listStoreProducts(): Promise<StoreProduct[]> {
  const snap = await getDocs(collection(db, "storeProducts"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: (x.name as string) ?? "",
      description: (x.description as string) ?? "",
      price: typeof x.price === "number" ? x.price : 0,
      stock: typeof x.stock === "number" ? x.stock : undefined,
      imageUrl: x.imageUrl as string | undefined,
      active: Boolean(x.active),
    };
  });
}

export async function createStoreProduct(
  input: Pick<StoreProduct, "name" | "description" | "price" | "stock">,
): Promise<void> {
  await addDoc(collection(db, "storeProducts"), {
    ...input,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setStoreProductActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "storeProducts", id), { active, updatedAt: serverTimestamp() });
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "storeProducts", id));
}

// ── Config de puntos (settings/clinic) ──────────────────────────────────────
export async function getClinicSettings(): Promise<ClinicInfo | null> {
  const snap = await getDoc(fbDoc(db, "settings", "clinic"));
  if (!snap.exists()) return null;
  return snap.data() as ClinicInfo;
}

export async function savePointsConfig(
  pointsThreshold: number,
  cisnesPerThreshold: number,
): Promise<void> {
  await setDoc(
    fbDoc(db, "settings", "clinic"),
    { pointsThreshold, cisnesPerThreshold, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ── Citas (colección `appointments`) ────────────────────────────────────────
export async function listAppointments(): Promise<Appointment[]> {
  const snap = await getDocs(
    query(collection(db, "appointments"), orderBy("startAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      patientId: (data.patientId as string) ?? "",
      treatmentId: (data.treatmentId as string) ?? "",
      cabinId: (data.cabinId as string) ?? "",
      startAt: normalizeDate(data.startAt),
      endAt: normalizeDate(data.endAt),
      status: (data.status as string) ?? "scheduled",
    };
  });
}

// ── Catálogo de recompensas (colección `rewardItems`) ───────────────────────
export async function listRewardItems(): Promise<RewardItem[]> {
  const snap = await getDocs(collection(db, "rewardItems"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: (data.title as string) ?? "",
      description: (data.description as string) ?? "",
      cost: typeof data.cost === "number" ? data.cost : 0,
      imageUrl: data.imageUrl as string | undefined,
      active: Boolean(data.active),
    };
  });
}

export async function createRewardItem(
  input: Pick<RewardItem, "title" | "description" | "cost">,
): Promise<void> {
  await addDoc(collection(db, "rewardItems"), {
    ...input,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function setRewardItemActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "rewardItems", id), { active, updatedAt: serverTimestamp() });
}

// Firestore puede devolver Timestamp o string; normalizamos a ISO string.
function normalizeDate(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}
