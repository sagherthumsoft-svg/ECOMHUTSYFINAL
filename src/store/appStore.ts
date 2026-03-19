// store/appStore.ts
import { create } from "zustand";

interface AppState {
  activeModal: string | null;
  searchQuery: string;
  showSearchBar: boolean;
  setActiveModal: (modal: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowSearchBar: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeModal: null,
  searchQuery: "",
  showSearchBar: false,
  setActiveModal: (modal) => set({ activeModal: modal }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowSearchBar: (show) => set({ showSearchBar: show }),
}));