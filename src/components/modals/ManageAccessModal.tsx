"use client";

import { useEffect, useState } from "react";
import { usePermissionStore, FeatureKey } from "@/store/permissionStore";
import { UserRole } from "@/types";
import { X, ShieldCheck, Save, Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const featureLabels: Record<FeatureKey, string> = {
  users: "Users Management",
  groups: "Groups Management",
  warehouses: "Warehouses Management",
  sheets: "Google Sheets",
  hr: "HR Management",
  tasks: "Task Management",
  announcements: "Announcements",
  chats: "Chat System",
};

const roleLabels: Record<Exclude<UserRole, "owner">, string> = {
  manager: "Manager",
  head: "Head",
  team_member: "Employee",
};

export default function ManageAccessModal({ isOpen, onClose }: ManageAccessModalProps) {
  const { permissions, setPermissions, fetchPermissions, isLoading } = usePermissionStore();
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  if (!isOpen) return null;

  const handleToggle = (role: Exclude<UserRole, "owner">, feature: FeatureKey) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role][feature],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, we might want a bulk update, but for now we update one by one
      // or just update the whole doc. The store's setPermissions updates the whole doc.
      // We can modify the store to accept the whole object.
      // For now, let's just make sure the store's setPermissions is efficient.
      
      // Let's implement a bulk update in the store or just here.
      const features = Object.keys(featureLabels) as FeatureKey[];
      const roles = Object.keys(roleLabels) as Exclude<UserRole, "owner">[];
      
      for (const role of roles) {
        for (const feature of features) {
          if (localPermissions[role][feature] !== permissions[role][feature]) {
            await setPermissions(role, feature, localPermissions[role][feature]);
          }
        }
      }
      
      toast.success("Permissions updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            Manage Access Control
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Area */}
        <div className="bg-orange-50 dark:bg-orange-900/10 px-6 py-3 border-b border-orange-100 dark:border-orange-800/30 flex items-center gap-2 text-orange-700 dark:text-orange-300 text-xs font-medium">
          <Info className="w-4 h-4" />
          Note: Changes apply globally to all users assigned to these roles. The Owner role always has full access.
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-zinc-800/50 sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Feature</th>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <th key={role} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {(Object.keys(featureLabels) as FeatureKey[]).map((feature) => (
                <tr key={feature} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-sm">
                    {featureLabels[feature]}
                  </td>
                  {(Object.keys(roleLabels) as Exclude<UserRole, "owner">[]).map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={localPermissions[role]?.[feature] || false}
                          onChange={() => handleToggle(role, feature)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
