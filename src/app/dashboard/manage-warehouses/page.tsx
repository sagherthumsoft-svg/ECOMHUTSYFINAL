"use client";

import { useEffect, useState } from "react";
import { Warehouse, User } from "@/types";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, Edit2, Package, Loader2, ArrowLeft, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import UserSelectionModal from "@/components/modals/UserSelectionModal";

export default function ManageWarehousesPage() {
  const router = useRouter();
  const { dbUser } = useUserStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    // Must have a valid uid before running any Firestore query
    if (!dbUser?.uid) return;

    // Redirect if not authorized
    if (!["owner", "head", "manager"].includes(dbUser.role)) {
      router.push("/dashboard");
      return;
    }

    // Filter by memberIds — matches the Firestore security rule:
    // allow read: if request.auth.uid in resource.data.memberIds
    const q = query(
      collection(db, "warehouses"),
      where("memberIds", "array-contains", dbUser.uid)
    );

    const unsubWarehouses = onSnapshot(q, (snapshot) => {
      setWarehouses(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            warehouseId: d.id,
            name: data.name || "Unnamed Warehouse",
            description: data.description || "",
            memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
            createdAt:
              typeof data.createdAt === "number"
                ? data.createdAt
                : data.createdAt?.toMillis?.() || Date.now(),
            createdBy: data.createdBy || "system",
            ...data,
          } as unknown as Warehouse;
        })
      );
    }, (error) => {
      console.error("Warehouses fetch error:", error);
      toast.error(`Warehouses Error: ${error.message}`);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((d) => ({ ...d.data(), uid: d.id } as User)));
    }, (error) => {
      console.error("Users fetch error:", error);
    });

    return () => {
      unsubWarehouses();
      unsubUsers();
    };
  }, [dbUser, router]);

  const handleDeleteWarehouse = async (warehouseId: string) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;
    setLoadingId(warehouseId);
    try {
      await deleteDoc(doc(db, "warehouses", warehouseId));
      toast.success("Warehouse deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full bg-[#f0f2f5] dark:bg-[#0b141a] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-7 h-7 text-emerald-600" />
              Manage Warehouses
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Organize and assign staff to storage hubs
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search warehouses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredWarehouses.map((warehouse) => (
              <div
                key={warehouse.warehouseId}
                className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                      {warehouse.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                      {warehouse.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-[10px] font-bold rounded uppercase tracking-wider">
                        {warehouse.memberIds.length} Staff Assigned
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingWarehouse(warehouse)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modify Staff
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.warehouseId)}
                      disabled={loadingId === warehouse.warehouseId}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      {loadingId === warehouse.warehouseId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredWarehouses.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                </div>
                <p className="text-slate-500 dark:text-zinc-400">
                  No warehouses found matching your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserSelectionModal
        isOpen={!!editingWarehouse}
        onClose={() => setEditingWarehouse(null)}
        initialSelected={editingWarehouse?.memberIds || []}
        onConfirm={async (ids: string[]) => {
          if (editingWarehouse) {
            try {
              // Write to memberIds (matches security rules & Warehouse type)
              await updateDoc(doc(db, "warehouses", editingWarehouse.warehouseId), {
                memberIds: ids,
              });
              toast.success("Staff updated");
              setEditingWarehouse(null);
            } catch (e: any) {
              toast.error(e.message);
            }
          }
        }}
        title="Edit Warehouse Staff"
        currentUserId={dbUser?.uid}
      />
    </div>
  );
}
