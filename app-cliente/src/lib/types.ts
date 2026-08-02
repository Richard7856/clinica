// Tipos de dominio reflejando los schemas de la clínica (lib/schemas/*).
// La app cliente solo LEE la mayoría; escribe al comprar / canjear.

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  qrSlug: string;
  points: number;
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

// Promoción / oferta mostrada al cliente y administrada desde el panel admin.
export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge?: string; // etiqueta corta, ej. "2x1", "GRATIS"
  active: boolean;
  createdAt?: string;
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
}
