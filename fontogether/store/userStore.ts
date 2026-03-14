import { create } from 'zustand';

interface UserStore {
  user: any | null;
  setUser: (user: any) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null, // 초기 상태
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
