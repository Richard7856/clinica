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

// Promoción / oferta mostrada al cliente y administrada desde el panel admin.
export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge?: string; // etiqueta corta, ej. "2x1", "GRATIS"
  active: boolean;
  createdAt?: string;
}

// Aparato / equipo (misma colección `devices` de la clínica).
export interface Device {
  id: string;
  name: string;
  type?: string;
  cabinId?: string;
  status: "active" | "maintenance" | "disabled";
}

// Cita (misma colección `appointments`).
export interface Appointment {
  id: string;
  patientId: string;
  treatmentId: string;
  cabinId: string;
  startAt: string;
  endAt: string;
  status: string;
}
