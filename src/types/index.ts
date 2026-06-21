export type PetSpecies = 'dog' | 'cat' | 'other';

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  age: number;
  ownerName: string;
  ownerPhone: string;
  createdAt: string;
}

export type RoomStatus = 'idle' | 'busy' | 'offline';

export interface Room {
  id: string;
  name: string;
  number: number;
  status: RoomStatus;
  vetName: string;
  currentAppointmentId?: string;
}

export type AppointmentStatus = 'waiting' | 'called' | 'visiting' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  queueNumber: string;
  petId: string;
  roomId: string;
  status: AppointmentStatus;
  priority: number;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
}

export interface TreatmentItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  isSimple: boolean;
  description: string;
}

export interface BillItem {
  id: string;
  treatmentItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isSimple: boolean;
}

export type BillStatus = 'unpaid' | 'paid' | 'refunded';

export interface Bill {
  id: string;
  appointmentId: string;
  petId: string;
  items: BillItem[];
  subtotal: number;
  basePriceAdjustment: number;
  ceilingPriceAdjustment: number;
  totalAmount: number;
  status: BillStatus;
  createdAt: string;
  paidAt?: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  appointmentId: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
}

export interface BillingConfig {
  basePrice: number;
  ceilingPrice: number;
  avgVisitMinutes: number;
}

export interface LoadBalanceInfo {
  roomId: string;
  waitingCount: number;
  loadRate: number;
  estimatedWaitMinutes: number;
}
