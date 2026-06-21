import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bill, BillItem } from '../types';
import { mockBills, generateId } from '../utils/mock';
import { calculateBill } from '../utils/billing';
import { useSettingsStore } from './useSettingsStore';

interface BillingState {
  bills: Bill[];

  createBill: (appointmentId: string, petId: string, items: Omit<BillItem, 'id' | 'subtotal'>[]) => Bill;
  getBillById: (id: string) => Bill | undefined;
  getBillsByPetId: (petId: string) => Bill[];
  getBillsByAppointmentId: (appointmentId: string) => Bill | undefined;
  payBill: (billId: string) => void;
  refundBill: (billId: string) => void;

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

      payBill: (billId) => {
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === billId ? { ...b, status: 'paid' as const, paidAt: new Date().toISOString() } : b
          ),
        }));
      },

      refundBill: (billId) => {
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === billId ? { ...b, status: 'refunded' as const } : b
          ),
        }));
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
