import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LoyaltyStore {
  points: number;
  addPoints: (amount: number) => void;
  redeemPoints: (pointsToRedeem: number) => number;
  reset: () => void;
}

export const useLoyaltyStore = create<LoyaltyStore>()(
  persist(
    (set, get) => ({
      points: 0,

      addPoints: (amount) => {
        set((state) => ({
          points: state.points + Math.floor(amount),
        }));
      },

      redeemPoints: (pointsToRedeem) => {
        const currentPoints = get().points;
        if (pointsToRedeem > currentPoints) return 0;

        const discount = pointsToRedeem * 0.01;
        set((state) => ({ points: state.points - pointsToRedeem }));
        return discount;
      },

      reset: () => set({ points: 0 }),
    }),
    { name: 'kushworld-loyalty' }
  )
);