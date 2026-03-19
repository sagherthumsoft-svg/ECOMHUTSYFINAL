import { create } from "zustand";
import { Chat } from "@/types";

import { Message } from "@/types";

interface ChatState {
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  messagesCache: Record<string, Message[]>;
  setMessagesCache: (chatId: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChat: null,
  setActiveChat: (activeChat) => set({ activeChat }),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  messagesCache: {},
  setMessagesCache: (chatId, messages) => 
    set((state) => ({ 
      messagesCache: { ...state.messagesCache, [chatId]: messages } 
    })),
}));
