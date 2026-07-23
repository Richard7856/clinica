import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

// Endpoint TEMPORAL de datos de ejemplo (demo). Protegido por CRON_SECRET.
// Siembra catálogos (tratamientos, cabinas, aparatos) si faltan, y un paciente
// de demo con paquete, sesiones pasadas/recientes (con cabina+aparato), citas
// de hoy, pagos y movimientos de puntos. Eliminar tras la demo.
//
// Idempotente en catálogos (no duplica por nombre). El paciente de demo se
// recrea si se vuelve a llamar (borra el anterior por qrSlug fijo).

export const dynamic = "force-dynamic";

const DEMO_QR = "DEMOPACIENTE";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  let body: { performedBy?: string; patientEmail?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const db = getAdminDb();
  const now = new Date();
  const ts = (d: Date) => Timestamp.fromDate(d);
  const auditNow = { createdAt: ts(now), updatedAt: ts(now) };

  // staff uid para performedBy/attendedBy: el primero que exista, o el dado.
  let staffUid = body.performedBy;
  if (!staffUid) {
    const s = await db.collection("staff").limit(1).get();
    staffUid = s.empty ? "demo-staff" : s.docs[0].id;
  }

  // ── 1. Catálogos idempotentes (por nombre) ─────────────────────────────────
  async function ensure(
    colName: string,
    nameField: string,
    name: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const existing = await db
      .collection(colName)
      .where(nameField, "==", name)
      .limit(1)
      .get();
    if (!existing.empty) return existing.docs[0].id;
    const ref = await db.collection(colName).add({ ...data, ...auditNow });
    return ref.id;
  }

  const treatmentId = await ensure("treatments", "name", "Depilación láser", {
    name: "Depilación láser",
    category: "Estética",
    basePrice: 800,
    durationMin: 30,
    requiresCabin: true,
    deviceIds: [],
    active: true,
  });
  const treatment2Id = await ensure("treatments", "name", "Limpieza facial", {
    name: "Limpieza facial",
    category: "Facial",
    basePrice: 600,
    durationMin: 45,
    requiresCabin: true,
    deviceIds: [],
    active: true,
  });
  const treatment3Id = await ensure("treatments", "name", "Radiofrecuencia", {
    name: "Radiofrecuencia",
    category: "Corporal",
    basePrice: 1200,
    durationMin: 60,
    requiresCabin: true,
    deviceIds: [],
    active: true,
  });

  const cabin1Id = await ensure("cabins", "name", "Cabina 1", {
    name: "Cabina 1",
    status: "active",
    notes: "Cabina principal",
  });
  const cabin2Id = await ensure("cabins", "name", "Cabina 2", {
    name: "Cabina 2",
    status: "active",
  });
  const cabin3Id = await ensure("cabins", "name", "Cabina 3", {
    name: "Cabina 3",
    status: "active",
  });

  const sopranoId = await ensure("devices", "name", "Soprano ICE", {
    name: "Soprano ICE",
    type: "Láser diodo",
    cabinId: cabin1Id,
    status: "active",
  });
  const hydraId = await ensure("devices", "name", "HydraFacial", {
    name: "HydraFacial",
    type: "Facial",
    cabinId: cabin2Id,
    status: "active",
  });
  const venusId = await ensure("devices", "name", "Venus Legacy", {
    name: "Venus Legacy",
    type: "Radiofrecuencia",
    cabinId: cabin3Id,
    status: "active",
  });

  // ── 2. Paciente de demo (recrea si ya existía por qrSlug) ──────────────────
  const prev = await db
    .collection("patients")
    .where("qrSlug", "==", DEMO_QR)
    .limit(1)
    .get();
  for (const d of prev.docs) await d.ref.delete();

  const patientRef = await db.collection("patients").add({
    fullName: "María Robles (Demo)",
    email: body.patientEmail ?? "",
    phone: "+52 55 1234 5678",
    doc: "ROBM900101",
    qrSlug: DEMO_QR,
    points: 0, // se ajusta con los movimientos de puntos abajo
    notes: "Paciente de demostración con historia de ejemplo.",
    ...auditNow,
  });
  const patientId = patientRef.id;

  // Historial médico
  await db.collection("patients").doc(patientId).collection("history").add({
    date: ts(daysAgo(now, 60)),
    type: "consulta",
    notes: "Primera valoración. Piel sensible, sin contraindicaciones.",
    allergies: "Ninguna conocida",
    medications: "—",
    attachments: [],
    createdBy: staffUid,
    ...auditNow,
  });

  // ── 3. Paquete de 5 sesiones, 3 ya usadas ──────────────────────────────────
  const pkgRef = await db.collection("packages").add({
    patientId,
    treatmentId,
    totalSessions: 5,
    usedSessions: 3,
    price: 3500,
    purchasedAt: ts(daysAgo(now, 45)),
    status: "active",
    notes: "Paquete depilación láser piernas completas",
    ...auditNow,
  });
  const packageId = pkgRef.id;

  // ── 4. Sesiones pasadas (con cabina + aparato → módulo 6) ──────────────────
  const sessions = [
    { n: 1, days: 45, cabin: cabin1Id, device: sopranoId, treat: treatmentId },
    { n: 2, days: 30, cabin: cabin1Id, device: sopranoId, treat: treatmentId },
    { n: 3, days: 15, cabin: cabin1Id, device: sopranoId, treat: treatmentId },
  ];
  for (const s of sessions) {
    await db.collection("sessions").add({
      patientId,
      treatmentId: s.treat,
      packageId,
      sessionNumber: s.n,
      date: ts(daysAgo(now, s.days)),
      cabinId: s.cabin,
      deviceId: s.device,
      performedBy: staffUid,
      notes: `Sesión ${s.n} de 5 — sin incidencias`,
      ...auditNow,
    });
  }

  // Una sesión suelta reciente de otro tratamiento (otra cabina/aparato)
  await db.collection("sessions").add({
    patientId,
    treatmentId: treatment2Id,
    sessionNumber: 1,
    date: ts(daysAgo(now, 7)),
    cabinId: cabin2Id,
    deviceId: hydraId,
    performedBy: staffUid,
    notes: "Limpieza facial de cortesía",
    ...auditNow,
  });

  // ── 5. Citas de HOY (en hora local, para que aparezcan en dashboard) ───────
  const apt1Start = atHourLocal(now, 16, 0);
  const apt1End = atHourLocal(now, 16, 30);
  await db.collection("appointments").add({
    patientId,
    treatmentId,
    cabinId: cabin1Id,
    staffId: staffUid,
    startAt: ts(apt1Start),
    endAt: ts(apt1End),
    status: "scheduled",
    notes: "Sesión 4 de 5",
    ...auditNow,
  });

  const apt2Start = atHourLocal(now, 18, 0);
  const apt2End = atHourLocal(now, 19, 0);
  await db.collection("appointments").add({
    patientId,
    treatmentId: treatment3Id,
    cabinId: cabin3Id,
    staffId: staffUid,
    startAt: ts(apt2Start),
    endAt: ts(apt2End),
    status: "confirmed",
    notes: "Radiofrecuencia abdomen",
    ...auditNow,
  });

  // ── 6. Pagos (con método y vinculados al paquete/servicio) ─────────────────
  await db.collection("payments").add({
    patientId,
    amount: 3500,
    method: "card",
    concept: "package",
    refId: packageId,
    date: ts(daysAgo(now, 45)),
    receivedBy: staffUid,
    notes: "Pago paquete depilación",
    ...auditNow,
  });
  await db.collection("payments").add({
    patientId,
    amount: 600,
    method: "cash",
    concept: "session",
    date: ts(daysAgo(now, 7)),
    receivedBy: staffUid,
    notes: "Limpieza facial",
    ...auditNow,
  });

  // ── 7. Puntos: ganados por compras + un canje ──────────────────────────────
  await db.collection("rewards").add({
    patientId, type: "earned", points: 3500,
    reason: "Compra: Paquete", refId: packageId,
    date: ts(daysAgo(now, 45)), ...auditNow,
  });
  await db.collection("rewards").add({
    patientId, type: "earned", points: 600,
    reason: "Compra: Sesión suelta",
    date: ts(daysAgo(now, 7)), ...auditNow,
  });
  await db.collection("rewards").add({
    patientId, type: "redeemed", points: 1000,
    reason: "Canje: descuento en sesión",
    date: ts(daysAgo(now, 5)), ...auditNow,
  });
  // Saldo final = 3500 + 600 - 1000 = 3100
  await db.collection("patients").doc(patientId).update({ points: 3100 });

  // ── 8. Catálogos de la app cliente (recompensas canjeables, productos, promos)
  // Recompensas canjeables por Cisnes
  await ensure("rewardItems", "title", "Facial de limpieza profunda", {
    title: "Facial de limpieza profunda",
    description: "Hidratación e higiene facial completa en cabina.",
    cost: 40,
    active: true,
  });
  await ensure("rewardItems", "title", "2×1 Criolipólisis", {
    title: "2×1 Criolipólisis",
    description: "Congelamos tu grasa en sesiones de 30 minutos.",
    cost: 500,
    active: true,
  });
  await ensure("rewardItems", "title", "2×1 Botox", {
    title: "2×1 Botox",
    description: "Trae a tu amiga y disfruten su tratamiento juntas.",
    cost: 550,
    active: true,
  });

  // Productos/servicios comprables
  await ensure("products", "name", "Depilación láser — Paquete 5 sesiones", {
    name: "Depilación láser — Paquete 5 sesiones",
    description: "Piernas completas",
    price: 3500,
    sessions: 5,
    active: true,
  });
  await ensure("products", "name", "Limpieza facial", {
    name: "Limpieza facial",
    description: "Sesión individual · 45 min",
    price: 600,
    active: true,
  });
  await ensure("products", "name", "Radiofrecuencia — Paquete 3 sesiones", {
    name: "Radiofrecuencia — Paquete 3 sesiones",
    description: "Abdomen",
    price: 3300,
    sessions: 3,
    active: true,
  });

  // Promociones activas
  await ensure("promotions", "title", "Facial de limpieza GRATIS", {
    title: "Facial de limpieza GRATIS",
    description: "En tu próxima visita al comprar cualquier paquete.",
    badge: "GRATIS",
    active: true,
  });
  await ensure("promotions", "title", "2×1 en Botox", {
    title: "2×1 en Botox",
    description: "Trae a una amiga este mes y paguen solo uno.",
    badge: "2x1",
    active: true,
  });

  return Response.json({
    ok: true,
    patientId,
    qrSlug: DEMO_QR,
    catalog: {
      treatments: [treatmentId, treatment2Id, treatment3Id],
      cabins: [cabin1Id, cabin2Id, cabin3Id],
      devices: [sopranoId, hydraId, venusId],
    },
    creado: {
      paquete: "5 sesiones (3 usadas)",
      sesiones: 4,
      citasHoy: 2,
      pagos: 2,
      puntos: 3100,
      rewardItems: 3,
      products: 3,
      promotions: 2,
    },
  });
}

function daysAgo(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

function atHourLocal(base: Date, hour: number, min: number): Date {
  const d = new Date(base);
  d.setHours(hour, min, 0, 0);
  return d;
}
