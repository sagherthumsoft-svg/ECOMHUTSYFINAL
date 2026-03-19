"use client";

import { useEffect, useState } from "react";
import { Group, User } from "@/types";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, Edit2, Users, Loader2, ArrowLeft, Search, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import UserSelectionModal from "@/components/modals/UserSelectionModal";
import { format } from "date-fns";

export default function ManageGroupsPage() {
  const router = useRouter();
  const { dbUser } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!dbUser?.uid) return;

    // Redirect if not authorized
    if (!["owner", "head", "manager"].includes(dbUser.role)) {
      router.push("/dashboard");
      return;
    }

    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", dbUser.uid)
    );

    const unsubGroups = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => {
        const data = doc.data();
        const rawMembers = data.members || data.participants || data.staff || data.users || data.assignedUsers || data.team || [];
        const rawCreatedAt = data.createdAt || data.created_at || data.timestamp || data.date || Date.now();
        
        return {
          groupId: doc.id,
          name: data.name || data.groupName || data.GroupName || data.group_name || data.title || data.label || "Unnamed Group",
          description: data.description || data.desc || data.details || data.info || "",
          memberIds: Array.isArray(rawMembers) ? rawMembers : [],
          createdAt: typeof rawCreatedAt === 'number' ? rawCreatedAt : (rawCreatedAt?.toMillis?.() || Date.now()),
          createdBy: data.createdBy || data.created_by || data.owner || data.admin || "system",
          ...data
        } as unknown as Group;
      }));
    }, (error) => {
      console.error("Groups fetch error:", error);
      toast.error(`Groups Error: ${error.message}`);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
    }, (error) => {
      console.error("Users fetch error:", error);
    });

    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, [dbUser, router]);

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    setLoadingId(groupId);
    try {
      // Direct Firestore deleteDoc as requested
      await deleteDoc(doc(db, "groups", groupId));
      toast.success("Group deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };


  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
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
              <Users className="w-7 h-7 text-emerald-600" />
              Manage Groups
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Create, edit and delete team groups</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111b21] rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search groups by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Group Info</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Created On</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px]">Members</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredGroups.map(group => (
                  <tr key={group.groupId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{group.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{group.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
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
                    <td colSpan={4} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No groups found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UserSelectionModal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        initialSelected={editingGroup?.memberIds || []}
        onConfirm={async (ids: string[]) => {
          if (editingGroup) {
            try {
              await updateDoc(doc(db, "groups", editingGroup.groupId), { memberIds: ids });
              toast.success("Members updated");
              setEditingGroup(null);
            } catch (e: any) {
              toast.error(e.message);
            }
          }
        }}
        title="Edit Group Members"
        currentUserId={dbUser?.uid}
      />
    </div>
  );
}
