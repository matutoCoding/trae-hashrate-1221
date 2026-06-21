import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TreatmentItem, BillingConfig } from '../types';
import { mockTreatmentItems, defaultBillingConfig, generateId } from '../utils/mock';

interface SettingsState {
  billingConfig: BillingConfig;
  treatmentItems: TreatmentItem[];

  updateBillingConfig: (config: Partial<BillingConfig>) => void;
  addTreatmentItem: (item: Omit<TreatmentItem, 'id'>) => void;
  updateTreatmentItem: (id: string, updates: Partial<TreatmentItem>) => void;
  removeTreatmentItem: (id: string) => void;
  getTreatmentItemById: (id: string) => TreatmentItem | undefined;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      billingConfig: defaultBillingConfig,
      treatmentItems: mockTreatmentItems,

      updateBillingConfig: (config) => {
        set((state) => ({
          billingConfig: { ...state.billingConfig, ...config },
        }));
      },

      addTreatmentItem: (itemData) => {
        const newItem: TreatmentItem = {
          ...itemData,
          id: generateId('item'),
        };
        set((state) => ({
          treatmentItems: [...state.treatmentItems, newItem],
        }));
      },

      updateTreatmentItem: (id, updates) => {
        set((state) => ({
          treatmentItems: state.treatmentItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      removeTreatmentItem: (id) => {
        set((state) => ({
          treatmentItems: state.treatmentItems.filter((item) => item.id !== id),
        }));
      },

      getTreatmentItemById: (id) => {
        return get().treatmentItems.find((item) => item.id === id);
      },
    }),
    {
      name: 'pet-clinic-settings',
    }
  )
);
