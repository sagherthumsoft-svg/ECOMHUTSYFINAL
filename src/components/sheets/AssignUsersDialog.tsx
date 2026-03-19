"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GoogleSheet } from "@/types/sheets";

interface AssignUsersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: GoogleSheet;
}

export default function AssignUsersDialog({ isOpen, onClose, sheet }: AssignUsersDialogProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({ canEdit: [] as string[], canView: [] as string[] });

  useEffect(() => {
    if (isOpen && sheet) {
       setPermissions({
          canEdit: sheet.permissions?.canEdit || [],
          canView: sheet.permissions?.canView || []
       });
       fetchUsers();
    }
  }, [isOpen, sheet]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (e) {
      console.error("Fetch users error:", e);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const togglePermission = (userId: string, type: 'view' | 'edit') => {
      setPermissions(prev => {
          const newPerms = { ...prev };
          
          if (type === 'edit') {
              if (newPerms.canEdit.includes(userId)) {
                  newPerms.canEdit = newPerms.canEdit.filter(id => id !== userId);
              } else {
                  newPerms.canEdit = [...newPerms.canEdit, userId];
                  // Allow view if editing
                  if (!newPerms.canView.includes(userId)) {
                      newPerms.canView = [...newPerms.canView, userId];
                  }
              }
          } else {
              if (newPerms.canView.includes(userId)) {
                  newPerms.canView = newPerms.canView.filter(id => id !== userId);
                  // Remove edit if view is removed
                  newPerms.canEdit = newPerms.canEdit.filter(id => id !== userId);
              } else {
                  newPerms.canView = [...newPerms.canView, userId];
              }
          }
          return newPerms;
      });
  };

  const handleSave = async () => {
      setSaving(true);
      const toastId = toast.loading("Saving permissions...");
      
      try {
        const { auth } = await import("@/lib/firebase");
        const idToken = await auth.currentUser?.getIdToken();
        
        const res = await fetch("/api/sheets/assign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            sheetId: sheet.id,
            permissions,
            assignedUsers: permissions.canView // Implicitly assigned if they can view
          }),
        });
        
        if (res.ok) {
          toast.success("Permissions updated", { id: toastId });
          onClose();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to save permissions", { id: toastId });
        }
      } catch (error) {
         console.error("Assign users error:", error);
         toast.error("An unexpected error occurred", { id: toastId });
      } finally {
         setSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[70vh] sm:h-auto sm:max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#202c33] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Manage Access
            </h2>
            <p className="text-xs text-slate-500 mt-1">Configure who can view or edit {sheet.name}</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
             <div className="flex justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
             </div>
          ) : (
            <div className="space-y-1">
               {users.map(user => {
                  if (user.role === 'owner' || user.role === 'head' || user.id === sheet.createdBy) {
                      return null; // Skip admins or creator as they have implicit full access
                  }

                  const canView = permissions.canView.includes(user.id);
                  const canEdit = permissions.canEdit.includes(user.id);

                  return (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-lg gap-3 sm:gap-0">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
                             {user.name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                             <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{user.name}</div>
                             <div className="text-xs text-slate-500 truncate">{user.email} • {user.role}</div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2 ml-11 sm:ml-0 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg shrink-0">
                          <button
                             onClick={() => togglePermission(user.id, 'view')}
                             className={`px-3 py-1 text-xs font-medium rounded-md transition ${canView ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                          >
                             Viewer
                          </button>
                          <button
                             onClick={() => togglePermission(user.id, 'edit')}
                             className={`px-3 py-1 text-xs font-medium rounded-md transition ${canEdit ? "bg-white dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                          >
                             Editor
                          </button>
                       </div>
                    </div>
                  );
               })}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end p-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 bg-slate-50 dark:bg-[#111b21]">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-zinc-800 rounded-lg transition disabled:opacity-50">
               Close
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50">
               {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
        </div>

      </div>
    </div>
  );
}
