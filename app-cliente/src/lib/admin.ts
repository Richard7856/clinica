import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { doc as fbDoc, getDoc as fbGetDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type {
  Treatment,
  Promotion,
  Device,
  Appointment,
  RewardItem,
  Clinic,
  StoreProduct,
  ClinicInfo,
  Patient,
  Payment,
  PaymentMethod,
} from "./types";
import { mapPromotion } from "./types";

// Operaciones del panel admin sobre Firestore. El staff tiene permisos de
// escritura (reglas de la clínica). Todo directo, sin backend intermedio.

// ── Promociones (colección nueva `promotions`) ──────────────────────────────
export async function listPromotions(): Promise<Promotion[]> {
  const snap = await getDocs(collection(db, "promotions"));
  return snap.docs
    .map((d) => mapPromotion(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// Lo que el formulario del panel envía. Se omite todo lo que no aplica al
// tipo elegido para no dejar basura en el documento (un "percent" colgando en
// una promo de 2x1 confunde a quien lea los datos después).
export type PromotionInput = Omit<Promotion, "id" | "active" | "createdAt">;

function promoDoc(input: PromotionInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    type: input.type,
    title: input.title,
    description: input.description,
    badge: input.badge ?? "",
    scope: input.scope,
    clinicIds: input.clinicIds ?? [],
    newClientsOnly: Boolean(input.newClientsOnly),
    // null y no undefined: Firestore ignora undefined, así que al editar no
    // se borraría un valor que el admin acaba de quitar.
    percent: input.type === "percent" ? input.percent ?? null : null,
    amount:
      input.type === "amount" || input.type === "fixed_price" ? input.amount ?? null : null,
    buyQty: input.type === "nxm" ? input.buyQty ?? null : null,
    payQty: input.type === "nxm" ? input.payQty ?? null : null,
    giftText: input.type === "gift" ? input.giftText ?? "" : "",
    multiplier: input.type === "points" ? input.multiplier ?? null : null,
    treatmentIds: input.scope === "treatments" ? input.treatmentIds ?? [] : [],
    category: input.scope === "category" ? input.category ?? null : null,
    minSpend: input.minSpend ?? null,
    endsAt: input.endsAt ?? null,
    updatedAt: serverTimestamp(),
  };
  return doc;
}

export async function createPromotion(input: PromotionInput): Promise<void> {
  await addDoc(collection(db, "promotions"), {
    ...promoDoc(input),
    active: true,
    createdAt: new Date().toISOString(),
  });
}

export async function setPromotionActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "promotions", id), { active, updatedAt: serverTimestamp() });
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<void> {
  await updateDoc(doc(db, "promotions", id), promoDoc(input));
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
  input: Pick<Clinic, "name" | "address" | "phone" | "horarios">,
): Promise<void> {
  await addDoc(collection(db, "clinics"), {
    name: input.name,
    address: input.address ?? "",
    phone: input.phone ?? "",
    horarios: input.horarios ?? null,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateClinic(
  id: string,
  input: Pick<Clinic, "name" | "address" | "phone" | "horarios">,
): Promise<void> {
  await updateDoc(doc(db, "clinics", id), {
    name: input.name,
    address: input.address ?? "",
    phone: input.phone ?? "",
    horarios: input.horarios ?? null,
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

export async function updateStoreProduct(
  id: string,
  input: Pick<StoreProduct, "name" | "description" | "price" | "stock">,
): Promise<void> {
  await updateDoc(doc(db, "storeProducts", id), {
    name: input.name,
    description: input.description,
    price: input.price,
    stock: input.stock ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "storeProducts", id));
}

// ── Config de puntos (settings/clinic) ──────────────────────────────────────
export async function getClinicSettings(): Promise<ClinicInfo | null> {
  const snap = await fbGetDoc(fbDoc(db, "settings", "clinic"));
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
      clinicId: (data.clinicId as string) ?? undefined,
      startAt: normalizeDate(data.startAt),
      endAt: normalizeDate(data.endAt),
      status: (data.status as string) ?? "scheduled",
      pointsAwarded: Boolean(data.pointsAwarded),
      amountSpent: typeof data.amountSpent === "number" ? data.amountSpent : undefined,
      notes: (data.notes as string) ?? undefined,
    };
  });
}

// ── Detalle de una cita ─────────────────────────────────────────────────────
export async function getAppointment(id: string): Promise<Appointment | null> {
  const snap = await fbGetDoc(fbDoc(db, "appointments", id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    patientId: (d.patientId as string) ?? "",
    treatmentId: (d.treatmentId as string) ?? "",
    cabinId: (d.cabinId as string) ?? "",
    clinicId: (d.clinicId as string) ?? undefined,
    startAt: normalizeDate(d.startAt),
    endAt: normalizeDate(d.endAt),
    status: (d.status as string) ?? "scheduled",
    pointsAwarded: Boolean(d.pointsAwarded),
    amountSpent: typeof d.amountSpent === "number" ? d.amountSpent : undefined,
    notes: (d.notes as string) ?? undefined,
  };
}

export async function getPatient(id: string): Promise<Patient | null> {
  const snap = await fbGetDoc(fbDoc(db, "patients", id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? undefined,
    qrSlug: (d.qrSlug as string) ?? snap.id,
    points: typeof d.points === "number" ? d.points : 0,
    banned: Boolean(d.banned),
    storeEnabled: Boolean(d.storeEnabled),
  };
}

// Lo que se hizo en la visita.
export async function saveAppointmentNotes(id: string, notes: string): Promise<void> {
  await updateDoc(doc(db, "appointments", id), { notes, updatedAt: serverTimestamp() });
}

// ── Cobros ──────────────────────────────────────────────────────────────────
// Solo where sobre un campo: no necesita índice compuesto.
export async function listPaymentsFor(refId: string): Promise<Payment[]> {
  const snap = await getDocs(query(collection(db, "payments"), where("refId", "==", refId)));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        patientId: (x.patientId as string) ?? "",
        amount: typeof x.amount === "number" ? x.amount : 0,
        method: (x.method as PaymentMethod) ?? "other",
        concept: (x.concept as string) ?? "session",
        refId: x.refId as string | undefined,
        date: normalizeDate(x.date),
        notes: x.notes as string | undefined,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// El documento sigue el esquema de la web para que los reportes de allá y el
// panel lean lo mismo.
export async function createPayment(input: {
  patientId: string;
  amount: number;
  method: PaymentMethod;
  refId: string;
  receivedBy: string;
  notes?: string;
}): Promise<void> {
  await addDoc(collection(db, "payments"), {
    patientId: input.patientId,
    amount: input.amount,
    method: input.method,
    concept: "session",
    refId: input.refId,
    date: new Date().toISOString(),
    receivedBy: input.receivedBy,
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Confirmar o cancelar desde la agenda. Sin esto, "por confirmar" era una
// cifra que nadie podía bajar desde la app.
export async function setAppointmentStatus(id: string, status: string): Promise<void> {
  await updateDoc(doc(db, "appointments", id), { status, updatedAt: serverTimestamp() });
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

export async function updateRewardItem(
  id: string,
  input: Pick<RewardItem, "title" | "description" | "cost">,
): Promise<void> {
  await updateDoc(doc(db, "rewardItems", id), {
    title: input.title,
    description: input.description,
    cost: input.cost,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRewardItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "rewardItems", id));
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
// Firestore puede devolver Timestamp o string; normalizamos a ISO string.
function normalizeDate(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

// Igual que normalizeDate pero devuelve Date. Fecha 0 = valor ausente.
function dateOf(v: unknown): Date {
  if (typeof v === "string") return new Date(v);
  if (v && typeof v === "object" && "toDate" in v) return (v as { toDate: () => Date }).toDate();
  return new Date(0);
}

// Clave de día LOCAL. Comparar en UTC hacía desaparecer las citas de la tarde.
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type KpiPeriodo = "hoy" | "semana" | "mes";

export interface AdminKpis {
  periodo: KpiPeriodo;
  periodoLabel: string; // "hoy", "los últimos 7 días"…
  // Dinero
  ingresos: number;
  ingresosPrevio: number; // mismo lapso inmediatamente anterior
  cobros: number;
  ticketPromedio: number;
  serie: { label: string; total: number }[];
  serieTitulo: string;
  serieVentana: string;
  porMetodo: { label: string; total: number }[];
  // Agenda
  hoyTotal: number;
  hoyPorConfirmar: number;
  hoyAtendidas: number;
  proximas: { hora: string; paciente: string; tratamiento: string }[];
  porConfirmar: number; // solicitudes a futuro sin confirmar
  // Catálogo y clientes
  topTratamientos: { name: string; count: number }[];
  totalPatients: number;
  nuevosClientes: number;
  // Lealtad
  cisnesEarned: number;
  cisnesRedeemed: number;
  topRewards: { title: string; count: number }[];
}

// Etiquetas de los métodos de pago. El esquema de la web usa el enum en
// inglés; los datos capturados a mano a veces vienen ya en español.
const METODO_LABEL: Record<string, string> = {
  cash: "Efectivo",
  efectivo: "Efectivo",
  transfer: "Transferencia",
  transferencia: "Transferencia",
  card: "Tarjeta",
  tarjeta: "Tarjeta",
  other: "Otro",
  otro: "Otro",
};

const PERIODO_DIAS: Record<KpiPeriodo, number> = { hoy: 1, semana: 7, mes: 30 };
const PERIODO_LABEL: Record<KpiPeriodo, string> = {
  hoy: "hoy",
  semana: "los últimos 7 días",
  mes: "los últimos 30 días",
};

// Inicio del día local hace `atras` días.
function diaInicio(atras: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - atras);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminKpis(periodo: KpiPeriodo = "mes"): Promise<AdminKpis> {
  const [paySnap, aptSnap, rewSnap, redSnap, patSnap, treatSnap] = await Promise.all([
    getDocs(collection(db, "payments")),
    getDocs(collection(db, "appointments")),
    getDocs(collection(db, "rewards")),
    getDocs(collection(db, "redemptions")),
    getDocs(collection(db, "patients")),
    getDocs(collection(db, "treatments")),
  ]);

  const dias = PERIODO_DIAS[periodo];
  const desde = diaInicio(dias - 1); // incluye hoy
  const desdePrevio = diaInicio(dias * 2 - 1);
  const hoyKey = localDay(new Date());

  // ── Ventas ───────────────────────────────────────────────────────────────
  // Un cobro puede venir de `payments` (capturado en recepción) o del monto
  // que el colaborador escribe al escanear el QR de una visita.
  const ventas: { date: Date; amount: number; metodo: string }[] = [];
  // Citas que ya tienen un cobro capturado en recepción: su `amountSpent` no
  // se vuelve a sumar, o el mismo dinero contaría dos veces.
  const conCobro = new Set<string>();
  paySnap.docs.forEach((d) => {
    const x = d.data();
    if (typeof x.refId === "string" && x.refId) conCobro.add(x.refId);
    if (typeof x.amount === "number")
      ventas.push({
        date: dateOf(x.date),
        amount: x.amount,
        metodo: METODO_LABEL[String(x.method ?? "").toLowerCase()] ?? "Otro",
      });
  });
  aptSnap.docs.forEach((d) => {
    const x = d.data();
    if (x.pointsAwarded && typeof x.amountSpent === "number" && !conCobro.has(d.id))
      ventas.push({
        date: dateOf(x.updatedAt ?? x.startAt),
        amount: x.amountSpent,
        metodo: "Sin método registrado",
      });
  });

  let ingresos = 0;
  let ingresosPrevio = 0;
  let cobros = 0;
  const porMetodoMap = new Map<string, number>();
  for (const v of ventas) {
    if (v.date >= desde) {
      ingresos += v.amount;
      cobros++;
      porMetodoMap.set(v.metodo, (porMetodoMap.get(v.metodo) ?? 0) + v.amount);
    } else if (v.date >= desdePrevio) {
      ingresosPrevio += v.amount;
    }
  }
  const porMetodo = [...porMetodoMap.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);

  // ── Serie temporal ───────────────────────────────────────────────────────
  // En "mes" agrupamos por semana: treinta barras no caben en un teléfono.
  const serie: { label: string; total: number }[] = [];
  let serieTitulo: string;
  let serieVentana: string;
  if (periodo === "mes") {
    serieTitulo = "Ventas por semana";
    serieVentana = "Últimas 6 semanas";
    for (let w = 5; w >= 0; w--) {
      const ini = diaInicio(w * 7 + 6);
      const fin = diaInicio(w * 7 - 1);
      const total = ventas
        .filter((v) => v.date >= ini && v.date < fin)
        .reduce((a, v) => a + v.amount, 0);
      serie.push({
        label: `${ini.getDate()}/${ini.getMonth() + 1}`,
        total,
      });
    }
  } else {
    serieTitulo = "Ventas por día";
    serieVentana = "Últimos 7 días";
    const porDia = new Map<string, number>();
    ventas.forEach((v) => porDia.set(localDay(v.date), (porDia.get(localDay(v.date)) ?? 0) + v.amount));
    for (let i = 6; i >= 0; i--) {
      const d = diaInicio(i);
      serie.push({
        label: d.toLocaleDateString("es-MX", { weekday: "short" }),
        total: porDia.get(localDay(d)) ?? 0,
      });
    }
  }

  // ── Agenda ───────────────────────────────────────────────────────────────
  const nombrePaciente = new Map<string, string>();
  patSnap.docs.forEach((d) => nombrePaciente.set(d.id, (d.data().fullName as string) ?? ""));
  const nombreTratamiento = new Map<string, string>();
  treatSnap.docs.forEach((d) => nombreTratamiento.set(d.id, (d.data().name as string) ?? ""));

  const ahora = new Date();
  let hoyTotal = 0;
  let hoyPorConfirmar = 0;
  let hoyAtendidas = 0;
  let porConfirmar = 0;
  const proximasRaw: { fecha: Date; paciente: string; tratamiento: string }[] = [];
  const conteoTratamiento = new Map<string, number>();

  aptSnap.docs.forEach((d) => {
    const x = d.data();
    const inicio = dateOf(x.startAt);
    const estado = String(x.status ?? "");
    const esHoy = localDay(inicio) === hoyKey;

    if (esHoy) {
      hoyTotal++;
      if (estado === "requested") hoyPorConfirmar++;
      if (x.pointsAwarded || estado === "completed") hoyAtendidas++;
    }
    if (estado === "requested" && inicio >= ahora) porConfirmar++;
    if (esHoy && inicio >= ahora && estado !== "cancelled" && !x.pointsAwarded) {
      proximasRaw.push({
        fecha: inicio,
        paciente: nombrePaciente.get(x.patientId) ?? "Cliente sin ficha",
        tratamiento: nombreTratamiento.get(x.treatmentId) ?? "Tratamiento",
      });
    }
    // Tratamientos más agendados dentro del periodo.
    if (inicio >= desde && x.treatmentId) {
      const n = nombreTratamiento.get(x.treatmentId);
      if (n) conteoTratamiento.set(n, (conteoTratamiento.get(n) ?? 0) + 1);
    }
  });

  const proximas = proximasRaw
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 3)
    .map((p) => ({
      hora: p.fecha
        .toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true })
        .replace(/\s*a\.?\s*m\.?/i, " am")
        .replace(/\s*p\.?\s*m\.?/i, " pm"),
      paciente: p.paciente,
      tratamiento: p.tratamiento,
    }));

  const topTratamientos = [...conteoTratamiento.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Clientes ─────────────────────────────────────────────────────────────
  let nuevosClientes = 0;
  patSnap.docs.forEach((d) => {
    const alta = dateOf(d.data().createdAt);
    if (alta.getTime() > 0 && alta >= desde) nuevosClientes++;
  });

  // ── Lealtad ──────────────────────────────────────────────────────────────
  let cisnesEarned = 0;
  let cisnesRedeemed = 0;
  rewSnap.docs.forEach((d) => {
    const x = d.data();
    const pts = typeof x.points === "number" ? x.points : 0;
    if (x.type === "earned") cisnesEarned += pts;
    else if (x.type === "redeemed") cisnesRedeemed += pts;
  });

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
    periodo,
    periodoLabel: PERIODO_LABEL[periodo],
    ingresos,
    ingresosPrevio,
    cobros,
    ticketPromedio: cobros > 0 ? Math.round(ingresos / cobros) : 0,
    serie,
    serieTitulo,
    serieVentana,
    porMetodo,
    hoyTotal,
    hoyPorConfirmar,
    hoyAtendidas,
    proximas,
    porConfirmar,
    topTratamientos,
    totalPatients: patSnap.size,
    nuevosClientes,
    cisnesEarned,
    cisnesRedeemed,
    topRewards,
  };
}

export async function listTreatmentsAdmin(): Promise<Treatment[]> {
  const snap = await getDocs(collection(db, "treatments"));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        name: (x.name as string) ?? "",
        category: (x.category as Treatment["category"]) ?? "facial",
        price: typeof x.price === "number" ? x.price : 0,
        priceMax: typeof x.priceMax === "number" ? x.priceMax : undefined,
        priceNote: x.priceNote as string | undefined,
        durationMin: typeof x.durationMin === "number" ? x.durationMin : 30,
        clinicIds: Array.isArray(x.clinicIds) ? (x.clinicIds as string[]) : [],
        cabins: (x.cabins as Record<string, string>) ?? undefined,
        active: x.active !== false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export interface TreatmentInput {
  name: string;
  category: Treatment["category"];
  price: number;
  priceMax?: number;
  priceNote?: string;
  durationMin: number;
  requires: Treatment["requires"];
  clinicIds: string[];
}

export async function createTreatment(input: TreatmentInput): Promise<void> {
  await addDoc(collection(db, "treatments"), {
    ...input,
    basePrice: input.price, // compatibilidad con la web
    requiresCabin: true,
    deviceIds: [],
    cabins: {},
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTreatment(
  id: string,
  patch: Partial<TreatmentInput>,
): Promise<void> {
  const extra = patch.price !== undefined ? { basePrice: patch.price } : {};
  await updateDoc(doc(db, "treatments", id), {
    ...patch,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

export async function setTreatmentActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "treatments", id), { active, updatedAt: serverTimestamp() });
}

export async function deleteTreatment(id: string): Promise<void> {
  await deleteDoc(doc(db, "treatments", id));
}
