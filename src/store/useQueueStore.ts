import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Appointment, Pet } from '../types';
import { mockAppointments, generateId, generateQueueNumber } from '../utils/mock';
import { useRoomStore } from './useRoomStore';
import { useSettingsStore } from './useSettingsStore';
import { findLeastBusyRoom } from '../utils/loadBalancer';

interface QueueState {
  appointments: Appointment[];
  currentQueueNumber: number;

  createAppointment: (pet: Pet) => Appointment;
  callNext: (roomId: string) => Appointment | null;
  startVisit: (appointmentId: string) => void;
  completeAppointment: (appointmentId: string) => void;
  cancelAppointment: (appointmentId: string) => void;
  transferAppointment: (appointmentId: string, targetRoomId: string) => void;

  getWaitingQueue: (roomId?: string) => Appointment[];
  getCurrentAppointment: (roomId: string) => Appointment | undefined;
  getAppointmentById: (id: string) => Appointment | undefined;

  getTodayStats: () => {
    total: number;
    waiting: number;
    visiting: number;
    completed: number;
  };
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      appointments: mockAppointments,
      currentQueueNumber: 5,

      createAppointment: (pet) => {
        const { rooms } = useRoomStore.getState();
        const { billingConfig } = useSettingsStore.getState();

        const targetRoom = findLeastBusyRoom(rooms, get().appointments, billingConfig);

        if (!targetRoom) {
          throw new Error('没有可用的诊室');
        }

        const newNumber = get().currentQueueNumber + 1;
        const newAppointment: Appointment = {
          id: generateId('appt'),
          queueNumber: generateQueueNumber(newNumber),
          petId: pet.id,
          roomId: targetRoom.id,
          status: 'waiting',
          priority: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          appointments: [...state.appointments, newAppointment],
          currentQueueNumber: newNumber,
        }));

        return newAppointment;
      },

      callNext: (roomId) => {
        const waitingList = get()
          .appointments.filter(
            (a) => a.roomId === roomId && a.status === 'waiting'
          )
          .sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

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

      getWaitingQueue: (roomId) => {
        return get()
          .appointments.filter((a) => {
            if (roomId && a.roomId !== roomId) return false;
            return a.status === 'waiting' || a.status === 'called';
          })
          .sort((a, b) => {
            if (a.status === 'called' && b.status !== 'called') return -1;
            if (b.status === 'called' && a.status !== 'called') return 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
        };
      },
    }),
    {
      name: 'pet-clinic-queue',
    }
  )
);
