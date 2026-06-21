import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Bill,
  BillItem,
  PaymentMethod,
  PaymentRecord,
  RefundRecord,
  BillStatus,
  FinancialTransaction,
  FinancialTransactionType,
  RefundType,
  BillItemRefundInfo,
} from '../types';
import { mockBills, generateId } from '../utils/mock';
import { calculateBill } from '../utils/billing';
import { useSettingsStore } from './useSettingsStore';

interface RefundBillOptions {
  refundType: RefundType;
  itemId?: string;
  itemName?: string;
}

interface BillingState {
  bills: Bill[];

  createBill: (appointmentId: string, petId: string, items: Omit<BillItem, 'id' | 'subtotal'>[]) => Bill;
  getBillById: (id: string) => Bill | undefined;
  getBillsByPetId: (petId: string) => Bill[];
  getBillsByAppointmentId: (appointmentId: string) => Bill | undefined;
  payBill: (billId: string, amount: number, method: PaymentMethod, operator: string, note?: string) => PaymentRecord;
  refundBill: (
    billId: string,
    amount: number,
    method: PaymentMethod,
    operator: string,
    reason: string,
    options: RefundBillOptions
  ) => RefundRecord;
  getPaymentRecordsByBillId: (billId: string) => PaymentRecord[];
  getRefundRecordsByBillId: (billId: string) => RefundRecord[];
  getRefundableAmount: (billId: string) => number;
  getFinancialTransactionsByPetId: (petId: string) => FinancialTransaction[];
  getItemRefundInfo: (billId: string, itemId: string) => BillItemRefundInfo;
  getBillItemsRefundInfo: (billId: string) => BillItemRefundInfo[];

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

      refundBill: (billId, amount, method, operator, reason, options) => {
        const bill = get().bills.find((b) => b.id === billId);
        if (!bill) {
          throw new Error('找不到账单');
        }

        if (bill.paidAmount <= 0) {
          throw new Error('该账单尚未收款，无法退款');
        }

        if (amount <= 0) {
          throw new Error('退款金额必须大于0');
        }

        const refundableAmount = bill.paidAmount - bill.refundedAmount;
        if (amount > refundableAmount) {
          throw new Error(`退款金额不能超过可退余额：¥${refundableAmount.toFixed(2)}`);
        }

        if (options.refundType === 'item' && options.itemId) {
          const itemRefundInfo = get().getItemRefundInfo(billId, options.itemId);
          if (amount > itemRefundInfo.refundableAmount) {
            throw new Error(
              `项目「${itemRefundInfo.itemName}」可退金额为 ¥${itemRefundInfo.refundableAmount.toFixed(2)}，退款金额不能超过该金额`
            );
          }
        }

        const refundRecord: RefundRecord = {
          id: generateId('refund'),
          billId,
          amount,
          method,
          operator,
          reason,
          refundType: options.refundType,
          itemId: options.itemId,
          itemName: options.itemName,
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

      getItemRefundInfo: (billId, itemId) => {
        const bill = get().bills.find((b) => b.id === billId);
        if (!bill) {
          throw new Error('找不到账单');
        }

        const item = bill.items.find((i) => i.id === itemId);
        if (!item) {
          throw new Error('找不到该项目');
        }

        const itemRefunds = bill.refunds.filter(
          (r) => r.refundType === 'item' && r.itemId === itemId
        );
        const refundedAmount = itemRefunds.reduce((sum, r) => sum + r.amount, 0);
        const remainingAmount = item.subtotal - refundedAmount;
        const billRefundableAmount = bill.paidAmount - bill.refundedAmount;
        const refundableAmount = Math.min(remainingAmount, billRefundableAmount);

        return {
          itemId: item.id,
          itemName: item.itemName,
          originalSubtotal: item.subtotal,
          refundedAmount,
          remainingAmount,
          refundableAmount,
        };
      },

      getBillItemsRefundInfo: (billId) => {
        const bill = get().bills.find((b) => b.id === billId);
        if (!bill) {
          throw new Error('找不到账单');
        }

        return bill.items.map((item) => get().getItemRefundInfo(billId, item.id));
      },

      getRefundableAmount: (billId: string) => {
        const bill = get().bills.find((b) => b.id === billId);
        if (!bill) return 0;
        return bill.paidAmount - bill.refundedAmount;
      },

      getPaymentRecordsByBillId: (billId) => {
        const bill = get().bills.find((b) => b.id === billId);
        return bill ? bill.payments : [];
      },

      getRefundRecordsByBillId: (billId) => {
        const bill = get().bills.find((b) => b.id === billId);
        return bill ? bill.refunds : [];
      },

      getFinancialTransactionsByPetId: (petId) => {
        const bills = get().getBillsByPetId(petId);
        const transactions: FinancialTransaction[] = [];

        bills.forEach((bill) => {
          bill.payments.forEach((payment) => {
            const transaction: FinancialTransaction = {
              id: payment.id,
              petId,
              type: 'payment' as FinancialTransactionType,
              amount: payment.amount,
              method: payment.method,
              operator: payment.operator,
              billId: bill.id,
              appointmentId: bill.appointmentId,
              note: payment.note,
              createdAt: payment.createdAt,
            };
            transactions.push(transaction);
          });

          bill.refunds.forEach((refund) => {
            const transaction: FinancialTransaction = {
              id: refund.id,
              petId,
              type: 'refund' as FinancialTransactionType,
              amount: refund.amount,
              method: refund.method,
              operator: refund.operator,
              billId: bill.id,
              appointmentId: bill.appointmentId,
              itemName: refund.itemName,
              reason: refund.reason,
              createdAt: refund.createdAt,
            };
            transactions.push(transaction);
          });
        });

        return transactions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
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
