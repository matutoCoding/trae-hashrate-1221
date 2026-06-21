import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reservation, TriagePriority, triagePriorityConfig, Pet, CheckInStatus, ReservationPerformanceStats, ReservationTimeSlot } from '../types';
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
  markOverdueReservationsAsNoShow: () => number;
  getReservationPerformanceStats: () => ReservationPerformanceStats[];

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

      markOverdueReservationsAsNoShow: () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinutes;

        const todayReservations = get().getReservationsByDate(today);
        const overdueIds: string[] = [];

        todayReservations.forEach((r) => {
          if (r.status !== 'scheduled' || r.appointmentId) return;

          let endMinutes: number;
          switch (r.timeSlot) {
            case 'morning':
              endMinutes = 12 * 60;
              break;
            case 'afternoon':
              endMinutes = 18 * 60;
              break;
            case 'custom':
              if (r.endTime) {
                const [h, m] = r.endTime.split(':').map(Number);
                endMinutes = h * 60 + m;
              } else {
                return;
              }
              break;
            default:
              return;
          }

          if (currentTotalMinutes > endMinutes) {
            overdueIds.push(r.id);
          }
        });

        if (overdueIds.length === 0) return 0;

        set((state) => ({
          reservations: state.reservations.map((r) =>
            overdueIds.includes(r.id) ? { ...r, status: 'no_show' as const } : r
          ),
        }));

        return overdueIds.length;
      },

      getReservationPerformanceStats: () => {
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = get().getReservationsByDate(today);
        const { appointments } = useQueueStore.getState();

        const timeSlotLabels: Record<ReservationTimeSlot, string> = {
          morning: '上午',
          afternoon: '下午',
          custom: '自定义时段',
        };

        const stats: Record<ReservationTimeSlot, ReservationPerformanceStats> = {
          morning: {
            timeSlot: 'morning',
            timeSlotLabel: timeSlotLabels.morning,
            total: 0,
            pending: 0,
            checkedIn: 0,
            late: 0,
            noShow: 0,
          },
          afternoon: {
            timeSlot: 'afternoon',
            timeSlotLabel: timeSlotLabels.afternoon,
            total: 0,
            pending: 0,
            checkedIn: 0,
            late: 0,
            noShow: 0,
          },
          custom: {
            timeSlot: 'custom',
            timeSlotLabel: timeSlotLabels.custom,
            total: 0,
            pending: 0,
            checkedIn: 0,
            late: 0,
            noShow: 0,
          },
        };

        todayReservations.forEach((r) => {
          const slot = r.timeSlot;
          stats[slot].total++;

          if (r.status === 'scheduled') {
            stats[slot].pending++;
          } else if (r.status === 'checked_in') {
            stats[slot].checkedIn++;
            const relatedAppt = r.appointmentId ? appointments.find((a) => a.id === r.appointmentId) : undefined;
            if (relatedAppt?.checkInStatus === 'late') {
              stats[slot].late++;
            }
          } else if (r.status === 'no_show') {
            stats[slot].noShow++;
          }
        });

        return [stats.morning, stats.afternoon, stats.custom];
      },
    }),
    {
      name: 'pet-clinic-reservations',
    }
  )
);
