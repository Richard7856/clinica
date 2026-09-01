// Tipos de dominio reflejando los schemas de la clínica (lib/schemas/*).
// La app cliente solo LEE la mayoría; escribe al comprar / canjear.

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  qrSlug: string;
  points: number;
  banned?: boolean; // admin lo bloqueó (no puede entrar)
  storeEnabled?: boolean; // acceso al ecommerce (no es para todos)
}

export type RewardType = "earned" | "redeemed";

export interface Reward {
  id: string;
  patientId: string;
  type: RewardType;
  points: number;
  reason: string;
  refId?: string;
  date: string;
}

// Catálogo de recompensas canjeables (nueva colección para la app cliente).
export interface RewardItem {
  id: string;
  title: string;
  description: string;
  cost: number; // en Cisnes
  imageUrl?: string;
  active: boolean;
}

// Servicios/paquetes comprables (pantalla "Comprar").
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // MXN
  sessions?: number;
  imageUrl?: string;
  active: boolean;
}

// Producto físico del ecommerce ("Tienda") — admin lo controla, cliente lo compra.
export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number; // MXN
  stock?: number;
  imageUrl?: string;
  active: boolean;
}

// Clínica (multi-clínica ligero). Los aparatos/citas se etiquetan con su id.
export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
}

// Tratamiento del catálogo. `clinicIds` define en qué sucursales se ofrece y
// `cabins` en qué cabina/consultorio se realiza en cada una.
export interface Treatment {
  id: string;
  name: string;
  category: "facial" | "corporal";
  price: number; // precio base (o mínimo si hay rango)
  priceMax?: number; // si el precio es un rango
  priceNote?: string; // ej. "por unidad"
  durationMin?: number;
  clinicIds: string[];
  cabins?: Record<string, string>; // clinicId → "Cabina 4"
  active: boolean;
}

// Formatea el precio de un tratamiento para mostrarlo al cliente.
export function treatmentPriceLabel(t: {
  price: number;
  priceMax?: number;
  priceNote?: string;
}): string {
  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const base = t.priceMax ? `${fmt(t.price)} – ${fmt(t.priceMax)}` : fmt(t.price);
  return t.priceNote ? `${base} ${t.priceNote}` : base;
}

// Config pública de la clínica (settings/clinic).
// Puntos: cada `pointsThreshold` pesos gastados otorgan `cisnesPerThreshold` Cisnes.
export interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  pointsLabel?: string; // "Cisnes" / "Estampas" / "Puntos"
  pointsThreshold?: number; // ej. 100 o 1000 (pesos)
  cisnesPerThreshold?: number; // ej. 10 (Cisnes por cada threshold)
}

// Calcula los Cisnes ganados por un gasto, según la config.
export function cisnesForAmount(
  amount: number,
  cfg: { pointsThreshold?: number; cisnesPerThreshold?: number },
): number {
  const th = cfg.pointsThreshold && cfg.pointsThreshold > 0 ? cfg.pointsThreshold : 100;
  const per = cfg.cisnesPerThreshold && cfg.cisnesPerThreshold > 0 ? cfg.cisnesPerThreshold : 1;
  return Math.floor(amount / th) * per;
}

// ── Promociones ─────────────────────────────────────────────────────────────
// Una promoción se arma con tres cosas: QUÉ da (tipo + valor), SOBRE QUÉ
// aplica (alcance) y CUÁNDO vale (condiciones). Antes era solo un título con
// una etiqueta escrita a mano, así que la app no podía ni ordenar ni caducar
// nada por su cuenta.
//
// `custom` existe para las promociones viejas, que solo traen texto: se
// siguen mostrando tal cual en vez de perderse.
export type PromotionType =
  | "percent" // 20% de descuento
  | "amount" // $500 de descuento
  | "nxm" // 2x1, 3x2
  | "fixed_price" // precio especial cerrado
  | "gift" // regalo o cortesía
  | "points" // Cisnes multiplicados
  | "custom"; // texto libre

export type PromotionScope =
  | "all" // todo el catálogo
  | "treatments" // tratamientos elegidos
  | "category" // todos los faciales o todos los corporales
  | "store"; // productos de la tienda

export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  description: string;
  badge?: string; // si se escribe, gana sobre la etiqueta automática

  // Valor, según el tipo
  percent?: number; // percent
  amount?: number; // amount (descuento) o fixed_price (precio final)
  buyQty?: number; // nxm: llevas
  payQty?: number; // nxm: pagas
  giftText?: string; // gift: qué se regala
  multiplier?: number; // points: cuántas veces los Cisnes

  // Alcance
  scope: PromotionScope;
  treatmentIds?: string[];
  category?: "facial" | "corporal";
  clinicIds?: string[]; // vacío = todas las sucursales

  // Condiciones
  minSpend?: number;
  endsAt?: string; // ISO; sin valor = sin vencimiento
  newClientsOnly?: boolean;

  active: boolean;
  createdAt?: string;
}

// Convierte el documento crudo de Firestore en una Promotion. Vive aquí para
// que el cliente y el panel lean exactamente lo mismo.
export function mapPromotion(id: string, d: Record<string, unknown>): Promotion {
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const tipo = (d.type as PromotionType) ?? "custom";
  return {
    id,
    type: tipo,
    title: (d.title as string) ?? "",
    description: (d.description as string) ?? "",
    badge: d.badge as string | undefined,
    percent: num(d.percent),
    amount: num(d.amount),
    buyQty: num(d.buyQty),
    payQty: num(d.payQty),
    giftText: d.giftText as string | undefined,
    multiplier: num(d.multiplier),
    scope: (d.scope as PromotionScope) ?? "all",
    treatmentIds: Array.isArray(d.treatmentIds) ? (d.treatmentIds as string[]) : undefined,
    category: d.category as "facial" | "corporal" | undefined,
    clinicIds: Array.isArray(d.clinicIds) ? (d.clinicIds as string[]) : undefined,
    minSpend: num(d.minSpend),
    endsAt: d.endsAt as string | undefined,
    newClientsOnly: Boolean(d.newClientsOnly),
    active: d.active !== false,
    createdAt: d.createdAt as string | undefined,
  };
}

export const PROMO_TIPO_LABEL: Record<PromotionType, string> = {
  percent: "Descuento en porcentaje",
  amount: "Descuento en pesos",
  nxm: "2x1 y similares",
  fixed_price: "Precio especial",
  gift: "Regalo o cortesía",
  points: "Cisnes multiplicados",
  custom: "Texto libre",
};

const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;

// Etiqueta corta del sello. Se calcula sola salvo que el admin escriba una.
export function promoBadge(p: Promotion): string {
  const manual = p.badge?.trim();
  if (manual) return manual;
  switch (p.type) {
    case "percent":
      return p.percent ? `−${p.percent}%` : "DESCUENTO";
    case "amount":
      return p.amount ? `−${pesos(p.amount)}` : "DESCUENTO";
    case "nxm":
      return `${p.buyQty ?? 2}X${p.payQty ?? 1}`;
    case "fixed_price":
      return p.amount ? pesos(p.amount) : "PRECIO ESPECIAL";
    case "gift":
      return "GRATIS";
    case "points":
      return `${p.multiplier ?? 2}X CISNES`;
    default:
      return "";
  }
}

// Frase que explica el beneficio, para cuando la descripción viene vacía.
export function promoBeneficio(p: Promotion): string {
  switch (p.type) {
    case "percent":
      return p.percent ? `${p.percent}% de descuento` : "Descuento";
    case "amount":
      return p.amount ? `${pesos(p.amount)} de descuento` : "Descuento";
    case "nxm":
      return `Llevas ${p.buyQty ?? 2}, pagas ${p.payQty ?? 1}`;
    case "fixed_price":
      return p.amount ? `Precio especial: ${pesos(p.amount)}` : "Precio especial";
    case "gift":
      return p.giftText?.trim() ? `De regalo: ${p.giftText.trim()}` : "Incluye un regalo";
    case "points":
      return `${p.multiplier ?? 2}× Cisnes en esta compra`;
    default:
      return "";
  }
}

// Letra chica: sobre qué aplica y hasta cuándo. Cada punto es una línea.
export function promoCondiciones(
  p: Promotion,
  nombres?: { tratamientos?: Record<string, string>; clinicas?: Record<string, string> },
): string[] {
  const out: string[] = [];

  if (p.scope === "treatments" && p.treatmentIds?.length) {
    const lista = p.treatmentIds
      .map((id) => nombres?.tratamientos?.[id])
      .filter(Boolean) as string[];
    if (lista.length) out.push(`Aplica en: ${lista.join(", ")}`);
  } else if (p.scope === "category" && p.category) {
    out.push(p.category === "facial" ? "Aplica en tratamientos faciales" : "Aplica en tratamientos corporales");
  } else if (p.scope === "store") {
    out.push("Aplica en productos de la tienda");
  }

  if (p.clinicIds?.length) {
    const lista = p.clinicIds.map((id) => nombres?.clinicas?.[id]).filter(Boolean) as string[];
    if (lista.length) out.push(`Solo en ${lista.join(" y ")}`);
  }

  if (p.minSpend && p.minSpend > 0) out.push(`En compras desde ${pesos(p.minSpend)}`);
  if (p.newClientsOnly) out.push("Solo para clientas nuevas");

  if (p.endsAt) {
    const d = new Date(p.endsAt);
    if (!Number.isNaN(d.getTime())) {
      out.push(
        `Vigente hasta el ${d.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`,
      );
    }
  }
  return out;
}

// Una promoción vencida se deja de mostrar sola: no depende de que alguien
// se acuerde de apagarla en el panel.
export function promoVigente(p: Promotion, ahora = new Date()): boolean {
  if (!p.endsAt) return true;
  const fin = new Date(p.endsAt);
  if (Number.isNaN(fin.getTime())) return true;
  return fin.getTime() >= ahora.getTime();
}

// Aparato / equipo. Se asigna a una clínica y tiene horarios.
export interface Device {
  id: string;
  name: string;
  type?: string;
  cabinId?: string;
  clinicId?: string; // en qué clínica está
  hours?: string; // horario de operación, ej. "Lun–Vie 10:00–21:00"
  status: "active" | "maintenance" | "disabled";
}

// Cita. Se etiqueta con clínica; los puntos se asignan al escanear el QR.
export interface Appointment {
  id: string;
  patientId: string;
  treatmentId: string;
  cabinId: string;
  clinicId?: string;
  startAt: string;
  endAt: string;
  status: string;
  pointsAwarded?: boolean; // true una vez que el colaborador escaneó y asignó
  amountSpent?: number;
  notes?: string; // qué se hizo en la visita
}

// Pago registrado en recepción. Refleja el esquema de la web (lib/schemas/payment).
export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  method: PaymentMethod;
  concept: string;
  refId?: string;
  date: string;
  notes?: string;
}
