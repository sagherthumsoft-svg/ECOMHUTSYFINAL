"use client";

import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import { usePermissionStore, FeatureKey } from "@/store/permissionStore";
import { cn } from "@/lib/utils";
import CreateUserModal from "@/components/modals/CreateUserModal";
import ManageUsersModal from "@/components/modals/ManageUsersModal";
import CreateGroupModal from "@/components/modals/CreateGroupModal";
import CreateWarehouseModal from "@/components/modals/CreateWarehouseModal";
import CreateTaskModal from "@/components/modals/CreateTaskModal";
import GoogleSheetsModal from "@/components/modals/GoogleSheetsModal";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  UserPlus,
  Users,
  MessageSquare,
  Building2,
  FileSpreadsheet,
  CheckSquare,
  Briefcase,
  ShieldCheck,
  BarChart3,
  LogOut,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function OwnerDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { dbUser, clearSession } = useUserStore();
  const { activeModal, setActiveModal } = useAppStore();
  const { permissions } = usePermissionStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    clearSession();
  };

  const actionList = [
    { icon: Users, label: "Manage Users", onClick: () => setActiveModal("manageUsers"), feature: "users" },
    { icon: Users, label: "Manage Groups", onClick: () => setActiveModal("manageGroups"), feature: "groups" },
    { icon: Building2, label: "Manage Warehouses", onClick: () => setActiveModal("manageWarehouses"), feature: "warehouses" },
    { icon: FileSpreadsheet, label: "Google Sheets", onClick: () => setActiveModal("googleSheets"), feature: "sheets" },
    { icon: Briefcase, label: "HR Manager", onClick: () => setActiveModal("hrManager"), feature: "hr" },
    { icon: ShieldCheck, label: "Manage Access", onClick: () => setActiveModal("manageAccess"), feature: "manageAccess" as any },
    { icon: BarChart3, label: "Reports", onClick: () => setActiveModal("reports"), feature: "reports" },
    { icon: CheckSquare, label: "Create Tasks", onClick: () => setActiveModal("createTask"), feature: "tasks" },
  ];

  const filteredActions = actionList.filter(item => {
    if (!dbUser?.role) return false;
    if (dbUser.role === "owner") return true;
    if (item.feature === "manageAccess") return false; // Only owner sees Manage Access
    
    const rolePermissions = permissions[dbUser.role as Exclude<typeof dbUser.role, "owner">];
    return rolePermissions?.[item.feature as FeatureKey];
  });

  const closeModals = () => setActiveModal(null);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 bg-white dark:bg-[#111b21] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-emerald-600 dark:bg-[#202c33] p-6 text-white flex flex-col pt-12 pb-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm mb-4">
            <img 
              src="/assets/only-logo.png" 
              alt="User Logo" 
              className="w-12 h-12 object-contain" 
            />
          </div>
          <h2 className="text-xl font-bold">{dbUser?.name}</h2>
          <p className="text-emerald-100 dark:text-slate-400 text-sm">{dbUser?.email}</p>
          <span className="mt-2 inline-block px-2 py-1 bg-white/20 dark:bg-zinc-700/50 rounded text-xs font-semibold w-max capitalize">
            {dbUser?.role}
          </span>
        </div>

        {/* Action List */}
        <div className="flex-1 overflow-y-auto py-2">
          <ul className="px-2 space-y-1">
            {filteredActions.map((item, idx) => (
              <li key={idx}>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202c33] rounded-xl transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center mr-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/20 transition-colors">
                    <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 opacity-80" />
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="px-6 py-4">
            <div className="border-t border-slate-100 dark:border-zinc-800" />
          </div>

          <ul className="px-2">
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/10 flex items-center justify-center mr-4 group-hover:bg-red-100 dark:group-hover:bg-red-900/20 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
