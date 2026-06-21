import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Pet } from '../types';
import { mockPets, generateId } from '../utils/mock';

interface PetState {
  pets: Pet[];
  addPet: (pet: Omit<Pet, 'id' | 'createdAt'>) => Pet;
  getPetById: (id: string) => Pet | undefined;
  updatePet: (id: string, updates: Partial<Pet>) => void;
  searchPets: (keyword: string) => Pet[];
}

export const usePetStore = create<PetState>()(
  persist(
    (set, get) => ({
      pets: mockPets,

      addPet: (petData) => {
        const newPet: Pet = {
          ...petData,
          id: generateId('pet'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ pets: [...state.pets, newPet] }));
        return newPet;
      },

      getPetById: (id) => {
        return get().pets.find((p) => p.id === id);
      },

      updatePet: (id, updates) => {
        set((state) => ({
          pets: state.pets.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      searchPets: (keyword) => {
        const lowerKeyword = keyword.toLowerCase();
        return get().pets.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerKeyword) ||
            p.ownerName.toLowerCase().includes(lowerKeyword) ||
            p.ownerPhone.includes(keyword)
        );
      },
    }),
    {
      name: 'pet-clinic-pets',
    }
  )
);
