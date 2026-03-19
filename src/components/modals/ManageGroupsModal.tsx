"use client";

import { useEffect, useState } from "react";
import { Group, User } from "@/types";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Trash2, Users, Loader2, Edit2, Search, Calendar, Plus, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import UserSelectionModal from "@/components/modals/UserSelectionModal";
import { format } from "date-fns";

export default function ManageGroupsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dbUser } = useUserStore();
  const { setActiveModal } = useAppStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [showBulkUserSelector, setShowBulkUserSelector] = useState(false);

  useEffect(() => {
    // Only listen when modal is open and user is authenticated to avoid permission errors
    if (!isOpen || !dbUser?.uid) return;

    try {
      const q = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", dbUser.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setGroups(snapshot.docs.map(doc => {
          const data = doc.data();
          // Fix: ensure memberIds is properly mapped from data or fallbacks
          const rawMembers = data.memberIds || data.members || data.participants || data.staff || data.users || data.assignedUsers || data.team || [];
          const rawCreatedAt = data.createdAt || data.created_at || data.timestamp || data.date || Date.now();

          return {
            ...data,
            groupId: doc.id,
            name: data.name || data.groupName || data.GroupName || data.group_name || data.title || data.label || "Unnamed Group",
            description: data.description || data.desc || data.details || data.info || "",
            memberIds: Array.isArray(rawMembers) ? rawMembers : [],
            createdAt: typeof rawCreatedAt === 'number' ? rawCreatedAt : (rawCreatedAt?.toMillis?.() || Date.now()),
            createdBy: data.createdBy || data.created_by || data.owner || data.admin || "system",
          } as unknown as Group;
        }));
      }, (error) => {
        console.error("Groups fetch error:", error);
        toast.error(`Groups Error: ${error.message}`);
      });

      return () => unsubscribe();
    } catch (error: any) {
      console.error("Error setting up groups listener:", error);
      toast.error(`Failed to load groups: ${error.message}`);
    }
  }, [isOpen, dbUser?.uid]);

  if (!isOpen) return null;

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    setLoadingId(groupId);
    try {
      await deleteDoc(doc(db, "groups", groupId));
      toast.success("Group deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredGroups = groups.filter(g => {
    const name = (g.name || "").toLowerCase();
    const description = (g.description || "").toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || description.includes(search);
  });

  const toggleSelectGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroupIds);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroupIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedGroupIds.size === filteredGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(filteredGroups.map(g => g.groupId)));
    }
  };

  const handleBulkDeleteGroups = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedGroupIds.size} groups? This action is irreversible.`)) return;
    
    setIsBulkDeleting(true);
    try {
      // In a real app, we might use a batch but for groups we can loop since it's usually small scale
      const promises = Array.from(selectedGroupIds).map(id => deleteDoc(doc(db, "groups", id)));
      await Promise.all(promises);
      toast.success(`Successfully deleted ${selectedGroupIds.size} groups`);
      setSelectedGroupIds(new Set());
    } catch (error: any) {
      toast.error(`Error deleting groups: ${error.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddUsers = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    setIsBulkAdding(true);
    try {
      const batch = writeBatch(db);
      selectedGroupIds.forEach(groupId => {
        const group = groups.find(g => g.groupId === groupId);
        if (group) {
          const updatedMembers = Array.from(new Set([...group.memberIds, ...userIds]));
          
          // 1. Dual-write membership
          batch.update(doc(db, "groups", groupId), { memberIds: updatedMembers });
          batch.update(doc(db, "chats", groupId), { memberIds: updatedMembers });

          // 2. Notify newly added members for this group
          const reallyNew = userIds.filter(uid => !group.memberIds.includes(uid));
          reallyNew.forEach(uid => {
            const notifRef = doc(collection(db, "clientNotifications"));
            batch.set(notifRef, {
              receiverIds: [uid],
              type: "Added to Group",
              message: `You were added to group: ${group.name}`,
              isRead: false,
              createdAt: Date.now(),
              link: "/dashboard/groups",
              groupId: groupId
            });
          });
        }
      });
      await batch.commit();
      toast.success(`Successfully added users to ${selectedGroupIds.size} groups`);
      setSelectedGroupIds(new Set());
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
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Groups</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View, edit and remove team groups</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModal("createGroup")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Group
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
              placeholder="Search groups by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedGroupIds.size > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {selectedGroupIds.size} groups selected
                </span>
                <button 
                  onClick={() => setSelectedGroupIds(new Set())}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBulkUserSelector(true)}
                  disabled={isBulkAdding}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  {isBulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Users
                </button>
                <button 
                  onClick={handleBulkDeleteGroups}
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
                  <th className="px-5 py-4 w-10">
                    <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                      {selectedGroupIds.size === filteredGroups.length && filteredGroups.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Group Info</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Created On</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Members</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredGroups.map(group => (
                  <tr key={group.groupId} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors ${selectedGroupIds.has(group.groupId) ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => toggleSelectGroup(group.groupId)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {selectedGroupIds.has(group.groupId) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{group.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{group.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span className="text-[13px]">{format(group.createdAt, "MMM d, yyyy")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                        {group.memberIds.length} MEMBERS
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Update
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.groupId)}
                          disabled={loadingId === group.groupId}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center min-w-[36px]"
                        >
                          {loadingId === group.groupId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No groups found mapping your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Selection Modal Integration */}
        {editingGroup && (
          <UserSelectionModal
            isOpen={true}
            onClose={() => setEditingGroup(null)}
            initialSelected={editingGroup.memberIds}
            onConfirm={async (ids) => {
              try {
                const batch = writeBatch(db);
                const groupRef = doc(db, "groups", editingGroup.groupId);
                const chatRef = doc(db, "chats", editingGroup.groupId);

                // 1. Dual-write membership
                batch.update(groupRef, { memberIds: ids });
                batch.update(chatRef, { memberIds: ids });

                // 2. Identify newly added members for notifications
                const newMembers = ids.filter(id => !editingGroup.memberIds.includes(id));
                newMembers.forEach(uid => {
                  const notifRef = doc(collection(db, "clientNotifications"));
                  batch.set(notifRef, {
                    receiverIds: [uid],
                    type: "Added to Group",
                    message: `You were added to group: ${editingGroup.name}`,
                    isRead: false,
                    createdAt: Date.now(),
                    link: "/dashboard/groups",
                    groupId: editingGroup.groupId
                  });
                });

                await batch.commit();
                toast.success("Group members updated successfully");
                setEditingGroup(null);
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
            title={`Manage ${editingGroup.name} Members`}
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
            title={`Add Users to ${selectedGroupIds.size} Groups`}
            currentUserId={dbUser?.uid}
          />
        )}
      </div>
    </div>
  );
}

