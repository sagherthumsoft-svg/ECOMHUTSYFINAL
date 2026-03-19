"use client";

import { useState } from "react";
import { X, FileSpreadsheet, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { GoogleSheet } from "@/types/sheets";

interface CreateSheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sheet: GoogleSheet) => void;
}

const TEMPLATES = [
  { id: "Custom", label: "Blank / Custom", desc: "Start with an empty custom sheet" },
  { id: "Orders", label: "Orders Tracking", desc: "Pre-filled columns for order management" },
  { id: "Inventory", label: "Inventory System", desc: "Track products, SKUs, and stock levels" },
  { id: "Sales", label: "Sales Pipeline", desc: "Manage reps, regions, and revenue" },
] as const;

export default function CreateSheetDialog({ isOpen, onClose, onSuccess }: CreateSheetDialogProps) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<string>("Custom");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a sheet name");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating Google Sheet...");
    
    try {
      const { auth } = await import("@/lib/firebase");
      const idToken = await auth.currentUser?.getIdToken();
      
      const res = await fetch("/api/sheets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          templateType: template,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Sheet created successfully", { id: toastId });
        setName("");
        setTemplate("Custom");
        // Pass back a stub to select it instantly, Firestore onSnapshot will update the rest
        onSuccess({ 
          id: data.id, 
          name: name.trim(), 
          templateType: template as any, 
          googleSheetId: data.googleSheetId,
          createdBy: auth.currentUser?.uid || "",
          createdByName: auth.currentUser?.displayName || "Me",
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
          assignedUsers: [auth.currentUser?.uid || ""],
          assignedGroups: [],
          permissions: {
            canEdit: [auth.currentUser?.uid || ""],
            canView: [auth.currentUser?.uid || ""]
          },
          isActive: true
        });
        onClose();
      } else {
        toast.error(data.error || "Failed to create sheet", { id: toastId });
      }
    } catch (error) {
       console.error("Create sheet error:", error);
       toast.error("An unexpected error occurred", { id: toastId });
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#202c33]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
               <FileSpreadsheet className="w-5 h-5" />
            </div>
            Create New Sheet
          </h2>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sheet Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Sales Report"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#202c33] border border-slate-300 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               {TEMPLATES.map(t => (
                 <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    disabled={loading}
                    className={`p-3 text-left border rounded-xl transition-all duration-200 ${
                      template === t.id 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500" 
                        : "border-slate-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:bg-zinc-800"
                    }`}
                 >
                    <div className={`text-sm font-bold ${template === t.id ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{t.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.desc}</div>
                 </button>
               ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button
               type="button"
               onClick={onClose}
               disabled={loading}
               className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition disabled:opacity-50"
            >
               Cancel
            </button>
            <button
               type="submit"
               disabled={loading}
               className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm disabled:opacity-60"
            >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Workspace"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
