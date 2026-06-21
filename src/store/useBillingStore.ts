import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bill, BillItem, PaymentMethod, PaymentRecord, RefundRecord, BillStatus } from '../types';
import { mockBills, generateId } from '../utils/mock';
import { calculateBill } from '../utils/billing';
import { useSettingsStore } from './useSettingsStore';

interface BillingState {
  bills: Bill[];

  createBill: (appointmentId: string, petId: string, items: Omit<BillItem, 'id' | 'subtotal'>[]) => Bill;
  getBillById: (id: string) => Bill | undefined;
  getBillsByPetId: (petId: string) => Bill[];
  getBillsByAppointmentId: (appointmentId: string) => Bill | undefined;
  payBill: (billId: string, amount: number, method: PaymentMethod, operator: string, note?: string) => PaymentRecord;
  refundBill: (billId: string, amount: number, method: PaymentMethod, operator: string, reason: string) => RefundRecord;
  getPaymentRecordsByBillId: (billId: string) => PaymentRecord[];
  getRefundRecordsByBillId: (billId: string) => RefundRecord[];

  calculatePreliminaryBill: (items: Omit<BillItem, 'id' | 'subtotal'>[]) => ReturnType<typeof calculateBill>;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      bills: mockBills,

      createBill: (appointmentId, petId, items) => {
        const { billingConfig } = useSettingsStore.getState();
        const calculation = calculateBill(items, billingConfig);

        const newBill: Bill = {
          id: generateId('bill'),
          appointmentId,
          petId,
          items: calculation.items,
          subtotal: calculation.subtotal,
          basePriceAdjustment: calculation.basePriceAdjustment,
          ceilingPriceAdjustment: calculation.ceilingPriceAdjustment,
          totalAmount: calculation.totalAmount,
          status: 'unpaid',
          paidAmount: 0,
          refundedAmount: 0,
          payments: [],
          refunds: [],
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ bills: [...state.bills, newBill] }));
        return newBill;
      },

      getBillById: (id) => {
        return get().bills.find((b) => b.id === id);
      },

      getBillsByPetId: (petId) => {
        return get()
          .bills.filter((b) => b.petId === petId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getBillsByAppointmentId: (appointmentId) => {
        return get().bills.find((b) => b.appointmentId === appointmentId);
      },

      payBill: (billId, amount, method, operator, note) => {
        const paymentRecord: PaymentRecord = {
          id: generateId('pay'),
          billId,
          amount,
          method,
          operator,
          note,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          bills: state.bills.map((b) => {
            if (b.id !== billId) return b;

            const newPaidAmount = b.paidAmount + amount;
            let newStatus: BillStatus = b.status;
            let newPaidAt = b.paidAt;

            if (newPaidAmount >= b.totalAmount) {
              newStatus = 'paid';
              newPaidAt = new Date().toISOString();
            } else if (newPaidAmount > 0) {
              newStatus = 'unpaid';
            }

            return {
              ...b,
              paidAmount: newPaidAmount,
              status: newStatus,
              paidAt: newPaidAt,
              payments: [...b.payments, paymentRecord],
            };
          }),
        }));

        return paymentRecord;
      },

      refundBill: (billId, amount, method, operator, reason) => {
        const refundRecord: RefundRecord = {
          id: generateId('refund'),
          billId,
          amount,
          method,
          operator,
          reason,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          bills: state.bills.map((b) => {
            if (b.id !== billId) return b;

            const newRefundedAmount = b.refundedAmount + amount;
            let newStatus: BillStatus = b.status;

            if (newRefundedAmount >= b.paidAmount) {
              newStatus = 'refunded';
            } else if (newRefundedAmount > 0) {
              newStatus = 'partially_refunded';
            }

            return {
              ...b,
              refundedAmount: newRefundedAmount,
              status: newStatus,
              refunds: [...b.refunds, refundRecord],
            };
          }),
        }));

        return refundRecord;
      },

      getPaymentRecordsByBillId: (billId) => {
        const bill = get().bills.find((b) => b.id === billId);
        return bill ? bill.payments : [];
      },

      getRefundRecordsByBillId: (billId) => {
        const bill = get().bills.find((b) => b.id === billId);
        return bill ? bill.refunds : [];
      },

      calculatePreliminaryBill: (items) => {
        const { billingConfig } = useSettingsStore.getState();
        return calculateBill(items, billingConfig);
      },
    }),
    {
      name: 'pet-clinic-bills',
    }
  )
);
