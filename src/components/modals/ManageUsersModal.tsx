"use client";

import { useEffect, useState } from "react";
import { User } from "@/types";
import { collection, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { X, Trash2, Loader2, ShieldAlert, UserPlus, Search, CheckSquare, Square, MoreHorizontal, UserCog, UserMinus, Plus } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { updateDoc, writeBatch } from "firebase/firestore";
import toast from "react-hot-toast";

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageUsersModal({ isOpen, onClose }: ManageUsersModalProps) {
  const { dbUser } = useUserStore();
  const { setActiveModal } = useAppStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // New States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showWarehouseSelector, setShowWarehouseSelector] = useState(false);
  const [isBulkAddingWh, setIsBulkAddingWh] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    });

    // Fetch groups for "Add to Group" action
    const groupsUnsubscribe = onSnapshot(collection(db, "groups"), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch warehouses for "Add to Warehouse" action
    const whUnsubscribe = onSnapshot(collection(db, "warehouses"), (snapshot) => {
      setWarehouses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      groupsUnsubscribe();
      whUnsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(user => {
    const name = (user.name || user.fullName || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const toggleSelectUser = (uid: string) => {
    const newSelected = new Set(selectedUids);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedUids(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUids.size === filteredUsers.length) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(filteredUsers.map(u => u.uid)));
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this user? This action is irreversible.")) return;

    setLoadingId(uid);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token not found. Please log in again.");

      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      toast.success("User deleted successfully!");
      setSelectedUids(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUids.size} users? This is irreversible.`)) return;
    
    setIsBulkDeleting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token not found.");

      // For simplicity in a small app, we loop. For larger scale, a bulk API endpoint is better.
      const uidsArray = Array.from(selectedUids);
      let successCount = 0;
      let failCount = 0;

      for (const uid of uidsArray) {
        try {
          const res = await fetch("/api/admin/delete-user", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({ uid }),
          });
          if (res.ok) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }

      toast.success(`Deleted ${successCount} users. ${failCount > 0 ? `${failCount} failed.` : ""}`);
      setSelectedUids(new Set());
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkRoleChange = async (newRole: string) => {
    const batch = writeBatch(db);
    selectedUids.forEach(uid => {
      const userRef = doc(db, "users", uid);
      batch.update(userRef, { role: newRole });
    });
    
    try {
      await batch.commit();
      toast.success(`Role updated to ${newRole} for ${selectedUids.size} users`);
      setSelectedUids(new Set());
      setShowRoleSelector(false);
    } catch (e) {
      toast.error("Failed to update roles");
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newMemberIdsArray = Array.from(new Set([...(group.memberIds || []), ...Array.from(selectedUids)]));
    
    try {
      await updateDoc(doc(db, "groups", groupId), {
        memberIds: newMemberIdsArray
      });
      toast.success(`Added ${selectedUids.size} users to ${group.name}`);
      setSelectedUids(new Set());
      setShowGroupSelector(false);
    } catch (e) {
      toast.error("Failed to add users to group");
    }
  };

  const handleBulkAddToWarehouse = async (warehouseId: string) => {
    const wh = warehouses.find(w => w.id === warehouseId);
    if (!wh) return;

    const newMemberIdsArray = Array.from(new Set([...(wh.memberIds || []), ...Array.from(selectedUids)]));
    
    try {
      await updateDoc(doc(db, "warehouses", warehouseId), {
        memberIds: newMemberIdsArray
      });
      toast.success(`Added ${selectedUids.size} users to ${wh.name || "Warehouse"}`);
      setSelectedUids(new Set());
      setShowWarehouseSelector(false);
    } catch (e) {
      toast.error("Failed to add users to warehouse");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Manage Users
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModal("createUser")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 flex flex-col">
          <div className="p-6 pb-0 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Caution: Deleting a user wipes their Firebase Auth and Firestore records permanently.
            </p>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {selectedUids.size > 0 && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 relative">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {selectedUids.size} users selected
                  </span>
                  <button 
                    onClick={() => setSelectedUids(new Set())}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                   <div className="relative">
                    <button 
                      onClick={() => { setShowRoleSelector(!showRoleSelector); setShowGroupSelector(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                    >
                      <UserCog className="w-3.5 h-3.5" /> Change Role
                    </button>
                    {showRoleSelector && (
                      <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl z-[60] p-1">
                        {["owner", "manager", "head", "team_member"].map(role => (
                          <button 
                            key={role}
                            onClick={() => handleBulkRoleChange(role)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded capitalize"
                          >
                            Set to {role.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => { setShowWarehouseSelector(!showWarehouseSelector); setShowGroupSelector(false); setShowRoleSelector(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Warehouse
                    </button>
                    {showWarehouseSelector && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl z-[60] p-1 flex flex-col max-h-48 overflow-y-auto">
                        <span className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Warehouse</span>
                        {warehouses.map(wh => (
                          <button 
                            key={wh.id}
                            onClick={() => handleBulkAddToWarehouse(wh.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded truncate"
                          >
                            {wh.name || "Unnamed Warehouse"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => { setShowGroupSelector(!showGroupSelector); setShowRoleSelector(false); setShowWarehouseSelector(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Group
                    </button>
                    {showGroupSelector && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl z-[60] p-1 flex flex-col max-h-48 overflow-y-auto">
                        <span className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Group</span>
                        {groups.map(group => (
                          <button 
                            key={group.id}
                            onClick={() => handleAddToGroup(group.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 rounded truncate"
                          >
                            {group.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleBulkDelete()}
                    disabled={isBulkDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                  >
                    {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete 
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                          {selectedUids.size === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr 
                        key={user.uid} 
                        className={`border-b border-slate-200 dark:border-zinc-800 last:border-0 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors ${selectedUids.has(user.uid) ? 'bg-emerald-50/50 dark:bg-emerald-900/5' : ''}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => toggleSelectUser(user.uid)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            {selectedUids.has(user.uid) ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                        <td className="px-4 py-3 capitalize">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                              user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                              user.role === 'head' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                           }`}>
                             {user.role?.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-right">
                          {user.role !== "owner" && (
                            <button
                              onClick={() => handleDelete(user.uid)}
                              disabled={loadingId === user.uid}
                              className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {loadingId === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr key="no-results">
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                             <Search className="w-8 h-8 opacity-20" />
                             <p>No users found matching "{searchQuery}"</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
