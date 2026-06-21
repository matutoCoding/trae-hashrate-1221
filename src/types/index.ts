export type PetSpecies = 'dog' | 'cat' | 'other';

export type TriagePriority = 'normal' | 'emergency' | 'followup';

export const triagePriorityConfig: Record<TriagePriority, { label: string; level: number; color: string }> = {
  emergency: { label: '急诊', level: 2, color: 'red' },
  followup: { label: '复诊', level: 1, color: 'blue' },
  normal: { label: '普通', level: 0, color: 'slate' },
};

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

export type AppointmentSource = 'walkin' | 'reservation';

export type AppointmentStatus = 'waiting' | 'called' | 'visiting' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  queueNumber: string;
  petId: string;
  roomId: string;
  status: AppointmentStatus;
  priority: TriagePriority;
  priorityLevel: number;
  source: AppointmentSource;
  reservationId?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
}

export type ReservationTimeSlot = 'morning' | 'afternoon' | 'custom';

export type ReservationStatus = 'scheduled' | 'checked_in' | 'cancelled' | 'no_show';

export interface Reservation {
  id: string;
  petId: string;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  priority: TriagePriority;
  priorityLevel: number;
  timeSlot: ReservationTimeSlot;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  status: ReservationStatus;
  appointmentId?: string;
  notes?: string;
  createdAt: string;
  checkedInAt?: string;
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

export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'member_balance';

export const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: string; color: string }> = {
  cash: { label: '现金', icon: '💵', color: 'emerald' },
  wechat: { label: '微信支付', icon: '💚', color: 'green' },
  alipay: { label: '支付宝', icon: '💙', color: 'blue' },
  member_balance: { label: '会员余额', icon: '💳', color: 'purple' },
};

export type PaymentStatus = 'pending' | 'paid' | 'partially_refunded' | 'fully_refunded';

export interface PaymentRecord {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  operator: string;
  note?: string;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  operator: string;
  reason: string;
  createdAt: string;
}

export type BillStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';

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
  paidAmount: number;
  refundedAmount: number;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  createdAt: string;
  paidAt?: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  appointmentId: string;
  billId?: string;
  diagnosis: string;
  treatment: string;
  treatmentPlan?: string;
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

export interface TransferSuggestion {
  appointmentId: string;
  queueNumber: string;
  petName: string;
  fromRoomId: string;
  fromRoomName: string;
  toRoomId: string;
  toRoomName: string;
  currentWaitMinutes: number;
  estimatedWaitMinutesAfter: number;
  improvementMinutes: number;
}

export interface TransferImpactPreview {
  appointmentId: string;
  queueNumber: string;
  petName: string;
  fromRoomId: string;
  fromRoomName: string;
  toRoomId: string;
  toRoomName: string;
  currentWaitMinutes: number;
  estimatedWaitMinutesAfter: number;
  improvementMinutes: number;
  currentPosition: number;
  estimatedPositionAfter: number;
}

export interface BatchTransferImpactPreview {
  items: TransferImpactPreview[];
  totalImprovementMinutes: number;
  overallBalanceBefore: number;
  overallBalanceAfter: number;
  balanceImprovementPercent: number;
}

export interface TransferItem {
  appointmentId: string;
  fromRoomId: string;
  toRoomId: string;
}

export interface BillingBreakdown {
  simpleItems: BillItem[];
  complexItems: BillItem[];
  simpleItemsSubtotal: number;
  complexItemsSubtotal: number;
  basePrice: number;
  ceilingPrice: number;
  simpleBasePriceApplied: boolean;
  complexCeilingApplied: boolean;
  simpleFinalAmount: number;
  complexFinalAmount: number;
  basePriceAdjustment: number;
  ceilingPriceAdjustment: number;
  totalAmount: number;
  hasBasePriceAdjustment: boolean;
  hasCeilingPriceAdjustment: boolean;
  hasMixedItems: boolean;
  adjustmentReason: string;
}
