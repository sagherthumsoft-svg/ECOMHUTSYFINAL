"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppBar from "@/components/layout/AppBar";
import OwnerDrawer from "@/components/layout/OwnerDrawer";
import CreateUserModal from "@/components/modals/CreateUserModal";
import ManageUsersModal from "@/components/modals/ManageUsersModal";
import CreateGroupModal from "@/components/modals/CreateGroupModal";
import CreateWarehouseModal from "@/components/modals/CreateWarehouseModal";
import CreateTaskModal from "@/components/modals/CreateTaskModal";
import GoogleSheetsModal from "@/components/modals/GoogleSheetsModal";
import NewChatModal from "@/components/modals/NewChatModal";
import ManageGroupsModal from "@/components/modals/ManageGroupsModal";
import ManageWarehousesModal from "@/components/modals/ManageWarehousesModal";
import HRManagerModal from "@/components/modals/HRManagerModal";
import ManageAccessModal from "@/components/modals/ManageAccessModal";
import { useAppStore } from "@/store/appStore";
import { usePermissionStore } from "@/store/permissionStore";
import { useMigration } from "@/hooks/useMigration";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authUser, dbUser, isLoading } = useUserStore();
  const { activeModal, setActiveModal } = useAppStore();
  const { fetchPermissions } = usePermissionStore();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fix 1: Run data migration once for owner — adds ownerUid to memberIds
  // of all existing chats/groups/warehouses that are missing it.
  useMigration(dbUser?.uid, dbUser?.role);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const closeModals = () => setActiveModal(null);

  useEffect(() => {
    if (!isLoading && (!authUser || !dbUser)) {
      router.replace("/login");
    }
  }, [isLoading, authUser, dbUser, router]);

  if (isLoading || !dbUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* AppBar at top */}
      <div className="flex flex-col flex-1 w-full h-full">
        <AppBar onMenuClick={() => setDrawerOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#111b21]">
          {children}
        </main>
      </div>

      {/* Modals */}
      <CreateUserModal isOpen={activeModal === "createUser"} onClose={closeModals} />
      <ManageUsersModal isOpen={activeModal === "manageUsers"} onClose={closeModals} />
      <CreateGroupModal isOpen={activeModal === "createGroup"} onClose={closeModals} />
      <CreateWarehouseModal isOpen={activeModal === "createWarehouse"} onClose={closeModals} />
      <CreateTaskModal isOpen={activeModal === "createTask"} onClose={closeModals} />
      <GoogleSheetsModal isOpen={activeModal === "googleSheets"} onClose={closeModals} />
      <NewChatModal />
      <ManageGroupsModal isOpen={activeModal === "manageGroups"} onClose={closeModals} />
      <ManageWarehousesModal isOpen={activeModal === "manageWarehouses"} onClose={closeModals} />
      <HRManagerModal isOpen={activeModal === "hrManager"} onClose={closeModals} />
      <ManageAccessModal isOpen={activeModal === "manageAccess"} onClose={closeModals} />

      {/* Drawer */}
      {(dbUser.role === "owner" || dbUser.role === "head" || dbUser.role === "manager") && (
        <OwnerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}
