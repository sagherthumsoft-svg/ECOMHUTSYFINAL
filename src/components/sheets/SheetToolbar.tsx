"use client";

import { useState } from "react";
import { Download, FileDown, PlusCircle, Trash2, Users } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { isAdmin, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { GoogleSheet } from "@/types/sheets";

interface SheetToolbarProps {
  sheet: GoogleSheet;
  onAssign: () => void;
  onDelete: () => void;
}

export default function SheetToolbar({ sheet, onAssign, onDelete }: SheetToolbarProps) {
  const { dbUser } = useUserStore();
  const [exporting, setExporting] = useState(false);

  const canEdit = 
       isAdmin(dbUser?.role) || 
       sheet.createdBy === dbUser?.uid || 
       sheet.permissions?.canEdit?.includes(dbUser?.uid || "");

  const canDelete = 
       isAdmin(dbUser?.role) || 
       sheet.createdBy === dbUser?.uid;

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
      setExporting(true);
      const toastId = toast.loading(`Exporting ${sheet.name} as ${format.toUpperCase()}...`);
      try {
        const { auth } = await import("@/lib/firebase");
        const idToken = await auth.currentUser?.getIdToken();
        
        const res = await fetch("/api/sheets/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ sheetId: sheet.id, format }),
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${sheet.name}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Export successful", { id: toastId });
        } else {
            const result = await res.json();
            toast.error(result.error || "Export failed", { id: toastId });
        }
      } catch (error) {
          console.error("Export error:", error);
          toast.error("Export error", { id: toastId });
      } finally {
          setExporting(false);
      }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-3 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#202c33] z-10">
       <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
             <FileDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{sheet.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Template: {sheet.templateType || 'Custom'} • ID: {sheet.id.slice(0, 8)}</p>
          </div>
       </div>

       <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
             <button
                disabled={exporting}
                onClick={() => handleExport("csv")}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition shadow-none hover:shadow-sm disabled:opacity-50"
             >
                CSV
             </button>
             <button
                disabled={exporting}
                onClick={() => handleExport("xlsx")}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition shadow-none hover:shadow-sm disabled:opacity-50"
             >
                XLSX
             </button>
             <button
                disabled={exporting}
                onClick={() => handleExport("pdf")}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition shadow-none hover:shadow-sm disabled:opacity-50"
             >
                PDF
             </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1"></div>

          {(canEdit || canDelete) && (
             <button
                onClick={onAssign}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 transition rounded-lg"
             >
                <Users className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline">Share</span>
             </button>
          )}

          {canDelete && (
             <button
                onClick={onDelete}
                className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-red-600 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-900/50 transition rounded-lg shrink-0"
                title="Delete Sheet"
             >
                <Trash2 className="w-4 h-4" />
             </button>
          )}
       </div>
    </div>
  );
}
