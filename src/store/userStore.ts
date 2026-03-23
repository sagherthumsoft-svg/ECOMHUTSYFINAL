import { create } from "zustand";
import { User } from "@/types";
import { User as AuthUser } from "firebase/auth";


interface UserState {
  authUser: AuthUser | null;
  dbUser: User | null;
  isLoading: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setDbUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  authUser: null,
  dbUser: null,
  isLoading: true, // Initial state is true until auth resolves via AuthProvider
  setAuthUser: (authUser) => set({ authUser }),
  setDbUser: (dbUser) => set({ dbUser }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ authUser: null, dbUser: null, isLoading: false }),
}));
