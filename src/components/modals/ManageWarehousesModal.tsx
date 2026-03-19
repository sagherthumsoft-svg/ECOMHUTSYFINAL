"use client";

import { useEffect, useState } from "react";
import { Warehouse, User } from "@/types";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Trash2, Building2, Loader2, Edit2, Search, Calendar, Plus, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import UserSelectionModal from "@/components/modals/UserSelectionModal";
import { format } from "date-fns";

export default function ManageWarehousesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dbUser } = useUserStore();
  const { setActiveModal } = useAppStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [selectedWhIds, setSelectedWhIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [showBulkUserSelector, setShowBulkUserSelector] = useState(false);

  useEffect(() => {
    if (!isOpen || !dbUser?.uid) return;

    try {
      const q = query(
        collection(db, "warehouses"),
        where("memberIds", "array-contains", dbUser.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setWarehouses(snapshot.docs.map(doc => {
          const data = doc.data();
          // Fix: ensure memberIds is properly mapped from data or fallbacks
          const rawStaff = data.memberIds || data.staff || data.participants || data.members || data.users || [];
          const rawCreatedAt = data.createdAt || data.created_at || data.timestamp || Date.now();

          return {
            ...data,
            warehouseId: doc.id,
            name: data.name || data.warehouseName || data.WarehouseName || data.title || "Unnamed Warehouse",
            description: data.description || data.desc || "",
            memberIds: Array.isArray(rawStaff) ? rawStaff : [],
            createdAt: typeof rawCreatedAt === 'number' ? rawCreatedAt : (rawCreatedAt?.toMillis?.() || Date.now()),
            createdBy: data.createdBy || "system",
          } as unknown as Warehouse;
        }));
      }, (error) => {
        console.error("Warehouses fetch error:", error);
        toast.error(`Warehouses Error: ${error.message}`);
      });

      return () => unsubscribe();
    } catch (error: any) {
      console.error("Error setting up warehouses listener:", error);
      toast.error(`Failed to load warehouses: ${error.message}`);
    }
  }, [isOpen, dbUser?.uid]);

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, "warehouses", id));
      toast.success("Warehouse deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = warehouses.filter(w => {
    const name = (w.name || "").toLowerCase();
    const description = (w.description || "").toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || description.includes(search);
  });

  const toggleSelectWh = (id: string) => {
    const newSelected = new Set(selectedWhIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedWhIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedWhIds.size === filtered.length) {
      setSelectedWhIds(new Set());
    } else {
      setSelectedWhIds(new Set(filtered.map(w => w.warehouseId)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedWhIds.size} warehouses? This action is irreversible.`)) return;
    
    setIsBulkDeleting(true);
    try {
      const promises = Array.from(selectedWhIds).map(id => deleteDoc(doc(db, "warehouses", id)));
      await Promise.all(promises);
      toast.success(`Successfully deleted ${selectedWhIds.size} warehouses`);
      setSelectedWhIds(new Set());
    } catch (error: any) {
      toast.error(`Error deleting warehouses: ${error.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    setIsBulkAdding(true);
    try {
      const batch = writeBatch(db);
      selectedWhIds.forEach(whId => {
        const wh = warehouses.find(w => w.warehouseId === whId);
        if (wh) {
          // Merge existing members with new ones ensuring uniqueness
          const updatedMembers = Array.from(new Set([...wh.memberIds, ...userIds]));
          
          // 1. Dual-write membership
          batch.update(doc(db, "warehouses", whId), { memberIds: updatedMembers });
          batch.update(doc(db, "chats", whId), { memberIds: updatedMembers });

          // 2. Notify newly added staff for this warehouse
          const reallyNew = userIds.filter(uid => !wh.memberIds.includes(uid));
          reallyNew.forEach(uid => {
            const notifRef = doc(collection(db, "clientNotifications"));
            batch.set(notifRef, {
              receiverIds: [uid],
              type: "Assigned to Warehouse",
              message: `You were assigned to warehouse: ${wh.name}`,
              isRead: false,
              createdAt: Date.now(),
              link: "/dashboard/warehouses",
              warehouseId: whId
            });
          });
        }
      });
      await batch.commit();
      toast.success(`Successfully added users to ${selectedWhIds.size} warehouses`);
      setSelectedWhIds(new Set());
      setShowBulkUserSelector(false);
    } catch (error: any) {
      toast.error(`Error adding users: ${error.message}`);
    } finally {
      setIsBulkAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Warehouses</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View and update facility assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModal("createWarehouse")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Warehouse
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-100 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedWhIds.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {selectedWhIds.size} warehouses selected
                </span>
                <button 
                  onClick={() => setSelectedWhIds(new Set())}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBulkUserSelector(true)}
                  disabled={isBulkAdding}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {isBulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Users
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                >
                  {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#111b21] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                      {selectedWhIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Warehouse Info</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Created On</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Staff</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filtered.map(wh => (
                  <tr key={wh.warehouseId} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${selectedWhIds.has(wh.warehouseId) ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => toggleSelectWh(wh.warehouseId)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {selectedWhIds.has(wh.warehouseId) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{wh.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{wh.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span className="text-[13px]">{format(wh.createdAt, "MMM d, yyyy")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase">
                        {wh.memberIds.length} STAFF
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingWh(wh)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Staff
                        </button>
                        <button
                          onClick={() => handleDelete(wh.warehouseId)}
                          disabled={loadingId === wh.warehouseId}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center min-w-[36px]"
                        >
                          {loadingId === wh.warehouseId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      No warehouses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Selection Modal */}
        {editingWh && (
          <UserSelectionModal
            isOpen={true}
            onClose={() => setEditingWh(null)}
            initialSelected={editingWh.memberIds}
            onConfirm={async (ids) => {
              try {
                const batch = writeBatch(db);
                const whRef = doc(db, "warehouses", editingWh.warehouseId);
                const chatRef = doc(db, "chats", editingWh.warehouseId);

                // 1. Dual-write membership
                batch.update(whRef, { memberIds: ids });
                batch.update(chatRef, { memberIds: ids });

                // 2. Notify newly added staff
                const newStaff = ids.filter(id => !editingWh.memberIds.includes(id));
                newStaff.forEach(uid => {
                  const notifRef = doc(collection(db, "clientNotifications"));
                  batch.set(notifRef, {
                    receiverIds: [uid],
                    type: "Assigned to Warehouse",
                    message: `You were assigned to warehouse: ${editingWh.name}`,
                    isRead: false,
                    createdAt: Date.now(),
                    link: "/dashboard/warehouses",
                    warehouseId: editingWh.warehouseId
                  });
                });

                await batch.commit();
                toast.success("Warehouse staff updated successfully");
                setEditingWh(null);
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
            title={`Manage ${editingWh.name} Staff`}
            currentUserId={dbUser?.uid}
          />
        )}

        {/* Bulk User Selection Modal */}
        {showBulkUserSelector && (
          <UserSelectionModal
            isOpen={true}
            onClose={() => setShowBulkUserSelector(false)}
            initialSelected={[]}
            onConfirm={handleBulkAddUsers}
            title={`Add Users to ${selectedWhIds.size} Warehouses`}
            currentUserId={dbUser?.uid}
          />
        )}
      </div>
    </div>
  );
}

