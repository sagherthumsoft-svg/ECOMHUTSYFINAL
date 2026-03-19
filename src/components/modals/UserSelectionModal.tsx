"use client";

import { useEffect, useState } from "react";
import { User } from "@/types";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Loader2, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  initialSelected: string[];
  title: string;
  currentUserId?: string;
}

export default function UserSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelected,
  title,
  currentUserId
}: UserSelectionModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(initialSelected);

    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs
        .map(doc => ({ ...doc.data(), uid: doc.id } as User))
        .filter(u => u.uid !== currentUserId);
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, initialSelected, currentUserId]);

  const toggleUser = (uid: string) => {
    setSelectedIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const filteredUsers = users.filter(u => 
    (u.fullName || u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-zinc-800">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-50 dark:border-zinc-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] bg-slate-50 dark:bg-zinc-800/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 px-6 text-center">
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredUsers.map(u => (
                <label
                  key={u.uid}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white dark:hover:bg-zinc-800 transition-colors ${selectedIds.includes(u.uid) ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedIds.includes(u.uid) ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'}`}>
                      {(u.fullName || u.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {u.fullName || u.email}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate lowercase">{u.role?.replace('_', ' ') || 'member'}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.includes(u.uid) ? 'bg-emerald-600 border-emerald-600' : 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600'}`}>
                    {selectedIds.includes(u.uid) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedIds.includes(u.uid)}
                      onChange={() => toggleUser(u.uid)}
                    />
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedIds)}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            Confirm ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
