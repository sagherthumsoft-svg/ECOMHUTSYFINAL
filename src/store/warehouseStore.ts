import { create } from "zustand";
import { Warehouse } from "@/types";

import { Message } from "@/types";

interface WarehouseState {
  activeWarehouse: Warehouse | null;
  setActiveWarehouse: (warehouse: Warehouse | null) => void;
  messagesCache: Record<string, Message[]>;
  setMessagesCache: (warehouseId: string, messages: Message[]) => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  activeWarehouse: null,
  setActiveWarehouse: (activeWarehouse) => set({ activeWarehouse }),
  messagesCache: {},
  setMessagesCache: (warehouseId, messages) => 
    set((state) => ({ 
      messagesCache: { ...state.messagesCache, [warehouseId]: messages } 
    })),
}));
