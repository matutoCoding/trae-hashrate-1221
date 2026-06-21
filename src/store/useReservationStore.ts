import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reservation, TriagePriority, triagePriorityConfig, Pet, CheckInStatus } from '../types';
import { mockReservations, generateId } from '../utils/mock';
import { useQueueStore } from './useQueueStore';
import { usePetStore } from './usePetStore';

interface CreateReservationData {
  petId: string;
  priority: TriagePriority;
  timeSlot: Reservation['timeSlot'];
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface ReservationState {
  reservations: Reservation[];

  createReservation: (data: CreateReservationData) => Reservation;
  checkInReservation: (reservationId: string) => void;
  cancelReservation: (reservationId: string) => void;
  markNoShow: (reservationId: string) => void;

  getReservationsByDate: (date: string) => Reservation[];
  getReservationById: (id: string) => Reservation | undefined;
  getReservationsByPetId: (petId: string) => Reservation[];
  getTodayReservations: () => Reservation[];
}

function calculateCheckInStatus(reservation: Reservation): CheckInStatus {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinutes;

  let scheduledStart: number;
  let scheduledEnd: number;

  switch (reservation.timeSlot) {
    case 'morning':
      scheduledStart = 8 * 60;
      scheduledEnd = 12 * 60;
      break;
    case 'afternoon':
      scheduledStart = 14 * 60;
      scheduledEnd = 18 * 60;
      break;
    case 'custom':
      if (reservation.startTime && reservation.endTime) {
        const [startH, startM] = reservation.startTime.split(':').map(Number);
        const [endH, endM] = reservation.endTime.split(':').map(Number);
        scheduledStart = startH * 60 + startM;
        scheduledEnd = endH * 60 + endM;
      } else {
        return 'on_time';
      }
      break;
    default:
      return 'on_time';
  }

  const earlyThreshold = scheduledStart - 30;
  const lateThreshold = scheduledStart + 15;

  if (currentTotalMinutes < earlyThreshold) {
    return 'early';
  } else if (currentTotalMinutes > lateThreshold) {
    return 'late';
  } else {
    return 'on_time';
  }
}

export const useReservationStore = create<ReservationState>()(
  persist(
    (set, get) => ({
      reservations: mockReservations,

      createReservation: (data) => {
        const pet = usePetStore.getState().getPetById(data.petId);
        if (!pet) {
          throw new Error('找不到宠物信息');
        }

        const priorityConfig = triagePriorityConfig[data.priority];
        const newReservation: Reservation = {
          id: generateId('res'),
          petId: data.petId,
          petName: pet.name,
          ownerName: pet.ownerName,
          ownerPhone: pet.ownerPhone,
          priority: data.priority,
          priorityLevel: priorityConfig.level,
          timeSlot: data.timeSlot,
          scheduledDate: data.scheduledDate,
          startTime: data.startTime,
          endTime: data.endTime,
          status: 'scheduled',
          notes: data.notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          reservations: [...state.reservations, newReservation],
        }));

        return newReservation;
      },

      checkInReservation: (reservationId) => {
        const reservation = get().getReservationById(reservationId);
        if (!reservation) {
          throw new Error('找不到预约记录');
        }
        if (reservation.status !== 'scheduled') {
          throw new Error('只有已预约的记录可以到店');
        }

        const pet = usePetStore.getState().getPetById(reservation.petId);
        if (!pet) {
          throw new Error('找不到宠物信息');
        }

        const checkInStatus = calculateCheckInStatus(reservation);

        const appointment = useQueueStore.getState().createAppointment(
          pet,
          reservation.priority,
          'reservation',
          reservationId,
          reservation.timeSlot,
          reservation.startTime,
          reservation.endTime,
          checkInStatus
        );

        const now = new Date().toISOString();
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId
              ? { ...r, status: 'checked_in' as const, appointmentId: appointment.id, checkedInAt: now }
              : r
          ),
        }));
      },

      cancelReservation: (reservationId) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: 'cancelled' as const } : r
          ),
        }));
      },

      markNoShow: (reservationId) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: 'no_show' as const } : r
          ),
        }));
      },

      getReservationsByDate: (date) => {
        return get().reservations.filter((r) => r.scheduledDate === date);
      },

      getReservationById: (id) => {
        return get().reservations.find((r) => r.id === id);
      },

      getReservationsByPetId: (petId) => {
        return get().reservations.filter((r) => r.petId === petId);
      },

      getTodayReservations: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().getReservationsByDate(today);
      },
    }),
    {
      name: 'pet-clinic-reservations',
    }
  )
);
