import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MedicalRecord } from '../types';
import { mockMedicalRecords, generateId } from '../utils/mock';

interface MedicalRecordState {
  records: MedicalRecord[];

  addRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt'>) => MedicalRecord;
  getRecordsByPetId: (petId: string) => MedicalRecord[];
  getRecordById: (id: string) => MedicalRecord | undefined;
  getRecordByAppointmentId: (appointmentId: string) => MedicalRecord | undefined;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => void;
}

export const useMedicalRecordStore = create<MedicalRecordState>()(
  persist(
    (set, get) => ({
      records: mockMedicalRecords,

      addRecord: (recordData) => {
        const newRecord: MedicalRecord = {
          ...recordData,
          id: generateId('record'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [...state.records, newRecord] }));
        return newRecord;
      },

      getRecordsByPetId: (petId) => {
        return get()
          .records.filter((r) => r.petId === petId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getRecordById: (id) => {
        return get().records.find((r) => r.id === id);
      },

      getRecordByAppointmentId: (appointmentId) => {
        return get().records.find((r) => r.appointmentId === appointmentId);
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
      },
    }),
    {
      name: 'pet-clinic-records',
    }
  )
);
