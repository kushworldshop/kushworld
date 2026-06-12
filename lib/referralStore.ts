import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReferralStore {
  code: string | null;
  referrerName: string | null;
  setReferral: (code: string, referrerName: string) => void;
  clearReferral: () => void;
}

export const useReferralStore = create<ReferralStore>()(
  persist(
    (set) => ({
      code: null,
      referrerName: null,

      setReferral: (code, referrerName) => {
        set({ code: code.toUpperCase(), referrerName });
      },

      clearReferral: () => set({ code: null, referrerName: null }),
    }),
    { name: 'kushworld-referral' }
  )
);