import { create } from "zustand";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { UserRole } from "@/types";

export type FeatureKey = 
  | "users" 
  | "groups" 
  | "warehouses" 
  | "sheets" 
  | "hr" 
  | "tasks" 
  | "announcements" 
  | "chats"
  | "reports";

export type RolePermissions = Record<FeatureKey, boolean>;

interface PermissionState {
  permissions: Record<Exclude<UserRole, "owner">, RolePermissions>;
  isLoading: boolean;
  setPermissions: (role: Exclude<UserRole, "owner">, feature: FeatureKey, value: boolean) => Promise<void>;
  fetchPermissions: () => void;
}

const defaultPermissions: Record<Exclude<UserRole, "owner">, RolePermissions> = {
  manager: {
    users: false,
    groups: true,
    warehouses: true,
    sheets: true,
    hr: false,
    tasks: true,
    announcements: true,
    chats: true,
    reports: true,
  },
  head: {
    users: true,
    groups: true,
    warehouses: true,
    sheets: true,
    hr: true,
    tasks: true,
    announcements: true,
    chats: true,
    reports: true,
  },
  team_member: {
    users: false,
    groups: false,
    warehouses: false,
    sheets: false,
    hr: false,
    tasks: false,
    announcements: true,
    chats: true,
    reports: false,
  },
};

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: defaultPermissions,
  isLoading: true,

  fetchPermissions: () => {
    if (!db) {
      set({ isLoading: false });
      return () => {};
    }
    const docRef = doc(db, "settings", "permissions");
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        set({ permissions: snapshot.data() as any, isLoading: false });
      } else {
        // Fallback to defaults in UI without writing to Firestore automatically
        // This avoids permission denied errors for non-owners if the doc doesn't exist
        set({ permissions: defaultPermissions, isLoading: false });
      }
    });
  },

  setPermissions: async (role, feature, value) => {
    if (!db) return;
    const newPermissions = {
      ...get().permissions,
      [role]: {
        ...get().permissions[role],
        [feature]: value,
      },
    };
    
    const docRef = doc(db, "settings", "permissions");
    await setDoc(docRef, newPermissions);
    // State will be updated via onSnapshot
  },
}));
