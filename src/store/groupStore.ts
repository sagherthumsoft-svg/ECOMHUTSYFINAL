import { create } from "zustand";
import { Group } from "@/types";

import { Message } from "@/types";

interface GroupState {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  messagesCache: Record<string, Message[]>;
  setMessagesCache: (groupId: string, messages: Message[]) => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  activeGroup: null,
  setActiveGroup: (activeGroup) => set({ activeGroup }),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  messagesCache: {},
  setMessagesCache: (groupId, messages) => 
    set((state) => ({ 
      messagesCache: { ...state.messagesCache, [groupId]: messages } 
    })),
}));
