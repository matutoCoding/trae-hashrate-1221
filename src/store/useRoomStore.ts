import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Room } from '../types';
import { mockRooms } from '../utils/mock';

interface RoomState {
  rooms: Room[];
  setRoomStatus: (roomId: string, status: Room['status']) => void;
  setCurrentAppointment: (roomId: string, appointmentId: string | undefined) => void;
  getRoomById: (roomId: string) => Room | undefined;
  getActiveRooms: () => Room[];
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      rooms: mockRooms,

      setRoomStatus: (roomId, status) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
        }));
      },

      setCurrentAppointment: (roomId, appointmentId) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, currentAppointmentId: appointmentId } : r
          ),
        }));
      },

      getRoomById: (roomId) => {
        return get().rooms.find((r) => r.id === roomId);
      },

      getActiveRooms: () => {
        return get().rooms.filter((r) => r.status !== 'offline');
      },

      addRoom: (roomData) => {
        const newRoom: Room = {
          ...roomData,
          id: `room-${Date.now()}`,
        };
        set((state) => ({ rooms: [...state.rooms, newRoom] }));
      },

      updateRoom: (roomId, updates) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
        }));
      },

      removeRoom: (roomId) => {
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== roomId),
        }));
      },
    }),
    {
      name: 'pet-clinic-rooms',
    }
  )
);
