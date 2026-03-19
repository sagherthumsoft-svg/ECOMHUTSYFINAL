"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useUserStore } from "@/store/userStore";
import { User } from "@/types";
import { X, Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import UserSelectionModal from "./UserSelectionModal";

export default function CreateGroupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dbUser } = useUserStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelectingUsers, setIsSelectingUsers] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
    });
    return () => unsubscribe();
  }, [isOpen]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedMembers([]);
    onClose();
  };

  const selectedUserNames = users
    .filter(u => selectedMembers.includes(u.uid))
    .map(u => u.fullName || u.email);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!name.trim()) return toast.error("Group name is required");
    if (!description.trim()) return toast.error("Description is required");
    if (selectedMembers.length === 0) return toast.error("Please add at least one member");
    
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in to create a group.");
      
      const idToken = await currentUser.getIdToken();
      if (!idToken) throw new Error("Authentication token not found. Please log in again.");

      const res = await fetch("/api/admin/create-group", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          groupName: name.trim(),
          description: description.trim(),
          members: selectedMembers
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      
      toast.success("Group created successfully");
      handleClose();
    } catch (error: any) {
      console.error("Create group error:", error);
      toast.error(error.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Group</h2>
              <p className="text-xs text-slate-500 mt-1">Setup a new team conversation</p>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Group Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 transition-all font-medium"
                placeholder="e.g. Sales Team"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 min-h-[100px] resize-none transition-all placeholder:text-slate-400"
                placeholder="What is this group about?"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Members</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                    {selectedMembers.length} Members
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSelectingUsers(true)}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-emerald-50/50 dark:bg-emerald-900/5 border-2 border-dashed border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Members</span>
              </button>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800 max-h-32 overflow-y-auto">
                  {selectedUserNames.map((userName, i) => (
                    <span key={i} className="px-2 py-1 bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {userName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3 border-t border-slate-100 dark:border-zinc-800 mt-2">
              <button 
                type="button" 
                onClick={handleClose}
                className="flex-1 py-3.5 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>

      <UserSelectionModal
        isOpen={isSelectingUsers}
        onClose={() => setIsSelectingUsers(false)}
        initialSelected={selectedMembers}
        onConfirm={(ids) => {
          setSelectedMembers(ids);
          setIsSelectingUsers(false);
        }}
        title="Select Group Members"
        currentUserId={dbUser?.uid}
      />
    </>
  );
}
