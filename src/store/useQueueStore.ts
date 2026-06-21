import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Appointment, Pet, TriagePriority, triagePriorityConfig, BillItem, AppointmentSource } from '../types';
import { mockAppointments, generateId, generateQueueNumber } from '../utils/mock';
import { useRoomStore } from './useRoomStore';
import { useSettingsStore } from './useSettingsStore';
import { useBillingStore } from './useBillingStore';
import { useMedicalRecordStore } from './useMedicalRecordStore';
import { findLeastBusyRoom } from '../utils/loadBalancer';
import { calculateBill } from '../utils/billing';

interface CompleteVisitData {
  diagnosis: string;
  treatmentPlan: string;
  treatment: string;
  notes: string;
  treatmentItems: Omit<BillItem, 'id' | 'subtotal'>[];
}

interface QueueState {
  appointments: Appointment[];
  currentQueueNumber: number;

  createAppointment: (pet: Pet, priority?: TriagePriority, source?: AppointmentSource, reservationId?: string) => Appointment;
  callNext: (roomId: string) => Appointment | null;
  startVisit: (appointmentId: string) => void;
  completeAppointment: (appointmentId: string) => void;
  completeVisitWithData: (appointmentId: string, data: CompleteVisitData) => { billId: string; recordId: string; billAmount: number };
  cancelAppointment: (appointmentId: string) => void;
  transferAppointment: (appointmentId: string, targetRoomId: string) => void;
  batchTransfer: (transfers: { appointmentId: string; fromRoomId: string; toRoomId: string }[]) => void;

  canCallNext: (roomId: string) => boolean;
  getWaitingQueue: (roomId?: string) => Appointment[];
  getCurrentAppointment: (roomId: string) => Appointment | undefined;
  getAppointmentById: (id: string) => Appointment | undefined;

  getTodayStats: () => {
    total: number;
    waiting: number;
    visiting: number;
    completed: number;
    emergency: number;
    followup: number;
  };
}

function sortAppointments(a: Appointment, b: Appointment): number {
  if (a.priorityLevel !== b.priorityLevel) {
    return b.priorityLevel - a.priorityLevel;
  }
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      appointments: mockAppointments,
      currentQueueNumber: 5,

      createAppointment: (pet, priority = 'normal', source = 'walkin', reservationId) => {
        const { rooms } = useRoomStore.getState();
        const { billingConfig } = useSettingsStore.getState();

        const targetRoom = findLeastBusyRoom(rooms, get().appointments, billingConfig);

        if (!targetRoom) {
          throw new Error('没有可用的诊室');
        }

        const priorityConfig = triagePriorityConfig[priority];
        const newNumber = get().currentQueueNumber + 1;
        const newAppointment: Appointment = {
          id: generateId('appt'),
          queueNumber: generateQueueNumber(newNumber),
          petId: pet.id,
          roomId: targetRoom.id,
          status: 'waiting',
          priority,
          priorityLevel: priorityConfig.level,
          source,
          reservationId: source === 'reservation' ? reservationId : undefined,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          appointments: [...state.appointments, newAppointment],
          currentQueueNumber: newNumber,
        }));

        return newAppointment;
      },

      canCallNext: (roomId) => {
        const currentAppt = get().appointments.find(
          (a) => a.roomId === roomId && (a.status === 'visiting' || a.status === 'called')
        );
        return !currentAppt;
      },

      callNext: (roomId) => {
        if (!get().canCallNext(roomId)) {
          throw new Error('当前诊室还有未完成的接诊，请先完成后再叫下一位');
        }

        const waitingList = get()
          .appointments.filter(
            (a) => a.roomId === roomId && a.status === 'waiting'
          )
          .sort(sortAppointments);

        if (waitingList.length === 0) return null;

        const nextAppointment = waitingList[0];
        const now = new Date().toISOString();

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === nextAppointment.id
              ? { ...a, status: 'called' as const, calledAt: now }
              : a
          ),
        }));

        useRoomStore.getState().setCurrentAppointment(roomId, nextAppointment.id);
        useRoomStore.getState().setRoomStatus(roomId, 'busy');

        return { ...nextAppointment, status: 'called', calledAt: now } as Appointment;
      },

      startVisit: (appointmentId) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status: 'visiting' as const } : a
          ),
        }));

        const appointment = get().appointments.find((a) => a.id === appointmentId);
        if (appointment) {
          useRoomStore.getState().setCurrentAppointment(appointment.roomId, appointmentId);
          useRoomStore.getState().setRoomStatus(appointment.roomId, 'busy');
        }
      },

      completeAppointment: (appointmentId) => {
        const now = new Date().toISOString();
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId
              ? { ...a, status: 'completed' as const, completedAt: now }
              : a
          ),
        }));

        const appointment = get().appointments.find((a) => a.id === appointmentId);
        if (appointment) {
          useRoomStore.getState().setCurrentAppointment(appointment.roomId, undefined);

          const remainingWaiting = get().appointments.filter(
            (a) => a.roomId === appointment.roomId && a.status === 'waiting'
          );
          if (remainingWaiting.length === 0) {
            useRoomStore.getState().setRoomStatus(appointment.roomId, 'idle');
          }
        }
      },

      completeVisitWithData: (appointmentId, data) => {
        const appointment = get().appointments.find((a) => a.id === appointmentId);
        if (!appointment) {
          throw new Error('找不到该就诊记录');
        }

        const { billingConfig } = useSettingsStore.getState();
        const calculation = calculateBill(data.treatmentItems, billingConfig);

        const bill = useBillingStore.getState().createBill(
          appointmentId,
          appointment.petId,
          data.treatmentItems
        );

        const record = useMedicalRecordStore.getState().addRecord({
          petId: appointment.petId,
          appointmentId,
          billId: bill.id,
          diagnosis: data.diagnosis,
          treatment: data.treatment,
          treatmentPlan: data.treatmentPlan,
          notes: data.notes,
        });

        get().completeAppointment(appointmentId);

        return { billId: bill.id, recordId: record.id, billAmount: calculation.totalAmount };
      },

      cancelAppointment: (appointmentId) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
          ),
        }));
      },

      transferAppointment: (appointmentId, targetRoomId) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointmentId ? { ...a, roomId: targetRoomId } : a
          ),
        }));
      },

      batchTransfer: (transfers) => {
        set((state) => {
          const updatedAppointments = [...state.appointments];
          transfers.forEach(({ appointmentId, toRoomId }) => {
            const index = updatedAppointments.findIndex((a) => a.id === appointmentId);
            if (index !== -1) {
              updatedAppointments[index] = {
                ...updatedAppointments[index],
                roomId: toRoomId,
              };
            }
          });
          return { appointments: updatedAppointments };
        });
      },

      getWaitingQueue: (roomId) => {
        return get()
          .appointments.filter((a) => {
            if (roomId && a.roomId !== roomId) return false;
            return a.status === 'waiting' || a.status === 'called';
          })
          .sort((a, b) => {
            if (a.status === 'called' && b.status !== 'called') return -1;
            if (b.status === 'called' && a.status !== 'called') return 1;
            return sortAppointments(a, b);
          });
      },

      getCurrentAppointment: (roomId) => {
        return get().appointments.find(
          (a) => a.roomId === roomId && (a.status === 'visiting' || a.status === 'called')
        );
      },

      getAppointmentById: (id) => {
        return get().appointments.find((a) => a.id === id);
      },

      getTodayStats: () => {
        const appointments = get().appointments;
        const today = new Date().toDateString();

        const todayAppointments = appointments.filter(
          (a) => new Date(a.createdAt).toDateString() === today
        );

        return {
          total: todayAppointments.length,
          waiting: todayAppointments.filter((a) => a.status === 'waiting').length,
          visiting: todayAppointments.filter((a) => a.status === 'visiting' || a.status === 'called').length,
          completed: todayAppointments.filter((a) => a.status === 'completed').length,
          emergency: todayAppointments.filter((a) => a.priority === 'emergency').length,
          followup: todayAppointments.filter((a) => a.priority === 'followup').length,
        };
      },
    }),
    {
      name: 'pet-clinic-queue',
    }
  )
);
