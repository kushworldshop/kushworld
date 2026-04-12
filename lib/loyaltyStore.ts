import { create } from 'zustand';

interface LoyaltyStore {
  points: number;
  addPoints: (amount: number) => void;
  redeemPoints: (pointsToRedeem: number) => number; // returns discount in dollars
  reset: () => void;
}

export const useLoyaltyStore = create<LoyaltyStore>((set, get) => ({
  points: 0,

  addPoints: (amount) => {
    set((state) => ({ 
      points: state.points + Math.floor(amount) 
    }));
  },

  redeemPoints: (pointsToRedeem) => {
    const currentPoints = get().points;
    if (pointsToRedeem > currentPoints) return 0;

    const discount = pointsToRedeem * 0.01; // 1 point = $0.01
    set((state) => ({ points: state.points - pointsToRedeem }));
    return discount;
  },

  reset: () => set({ points: 0 }),
}));