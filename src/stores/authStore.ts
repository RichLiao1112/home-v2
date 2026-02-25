'use client';

import { create } from 'zustand';
import { apiCheckSession, apiLogin, apiLogout } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isChecking: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isChecking: true,

  login: async (password: string) => {
    const success = await apiLogin(password);
    set({ isAuthenticated: success });
    return success;
  },

  logout: async () => {
    await apiLogout();
    set({ isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isChecking: true });
    const authenticated = await apiCheckSession();
    set({ isAuthenticated: authenticated, isChecking: false });
  },
}));
