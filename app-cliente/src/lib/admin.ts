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
  Patient,
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

// ── Usuarios (pacientes): restringir + acceso a tienda ──────────────────────
export async function listPatients(): Promise<Patient[]> {
  const snap = await getDocs(collection(db, "patients"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      fullName: (x.fullName as string) ?? "",
      email: (x.email as string) ?? "",
      phone: x.phone as string | undefined,
      qrSlug: (x.qrSlug as string) ?? "",
      points: typeof x.points === "number" ? x.points : 0,
      banned: Boolean(x.banned),
      storeEnabled: Boolean(x.storeEnabled),
    };
  });
}

export async function setPatientBanned(id: string, banned: boolean): Promise<void> {
  await updateDoc(doc(db, "patients", id), { banned, updatedAt: serverTimestamp() });
}

export async function setPatientStoreEnabled(id: string, storeEnabled: boolean): Promise<void> {
  await updateDoc(doc(db, "patients", id), { storeEnabled, updatedAt: serverTimestamp() });
}

// ── KPIs / panel financiero ─────────────────────────────────────────────────
export interface AdminKpis {
  totalSales: number;
  salesToday: number;
  salesWeek: number;
  salesByDay: { label: string; total: number }[]; // últimos 7 días
  visits: number; // citas con puntos asignados (atendidas)
  requested: number; // citas solicitadas pendientes
  cisnesEarned: number;
  cisnesRedeemed: number;
  topRewards: { title: string; count: number }[];
  totalPatients: number;
}

function dateOf(v: unknown): Date {
  if (typeof v === "string") return new Date(v);
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate: () => Date }).toDate();
  return new Date(0);
}
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const [paySnap, aptSnap, rewSnap, redSnap, patSnap] = await Promise.all([
    getDocs(collection(db, "payments")),
    getDocs(collection(db, "appointments")),
    getDocs(collection(db, "rewards")),
    getDocs(collection(db, "redemptions")),
    getDocs(collection(db, "patients")),
  ]);

  const today = localDay(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  // Ventas = pagos + montos gastados capturados en visitas escaneadas.
  const sales: { date: Date; amount: number }[] = [];
  paySnap.docs.forEach((d) => {
    const x = d.data();
    if (typeof x.amount === "number") sales.push({ date: dateOf(x.date), amount: x.amount });
  });
  aptSnap.docs.forEach((d) => {
    const x = d.data();
    if (x.pointsAwarded && typeof x.amountSpent === "number")
      sales.push({ date: dateOf(x.updatedAt ?? x.startAt), amount: x.amountSpent });
  });

  let totalSales = 0, salesToday = 0, salesWeek = 0;
  const byDay = new Map<string, number>();
  for (const s of sales) {
    totalSales += s.amount;
    const dk = localDay(s.date);
    if (dk === today) salesToday += s.amount;
    if (s.date >= weekAgo) { salesWeek += s.amount; byDay.set(dk, (byDay.get(dk) ?? 0) + s.amount); }
  }
  // últimos 7 días en orden
  const salesByDay: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dk = localDay(d);
    salesByDay.push({ label: d.toLocaleDateString("es-MX", { weekday: "short" }), total: byDay.get(dk) ?? 0 });
  }

  let visits = 0, requested = 0;
  aptSnap.docs.forEach((d) => {
    const x = d.data();
    if (x.pointsAwarded) visits++;
    else if ((x.status ?? "") === "requested") requested++;
  });

  let cisnesEarned = 0, cisnesRedeemed = 0;
  rewSnap.docs.forEach((d) => {
    const x = d.data();
    const pts = typeof x.points === "number" ? x.points : 0;
    if (x.type === "earned") cisnesEarned += pts; else if (x.type === "redeemed") cisnesRedeemed += pts;
  });

  // Desempeño: recompensas más canjeadas (desde redemptions).
  const rewardCount = new Map<string, number>();
  redSnap.docs.forEach((d) => {
    const t = (d.data().title as string) ?? "Recompensa";
    rewardCount.set(t, (rewardCount.get(t) ?? 0) + 1);
  });
  const topRewards = [...rewardCount.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSales, salesToday, salesWeek, salesByDay,
    visits, requested, cisnesEarned, cisnesRedeemed,
    topRewards, totalPatients: patSnap.size,
  };
}

// Firestore puede devolver Timestamp o string; normalizamos a ISO string.
function normalizeDate(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}
