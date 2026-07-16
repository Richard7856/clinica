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

// Servicios/paquetes comprables.
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // MXN
  sessions?: number;
  imageUrl?: string;
  active: boolean;
}

// Config pública de la clínica (ubicación, horarios) — settings/clinic.
export interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  pointsLabel?: string; // "Cisnes" / "Estampas" / "Puntos"
}
