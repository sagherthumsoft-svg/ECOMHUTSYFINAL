"use client";

import { useState } from "react";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { GoogleSheet } from "@/types/sheets";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sheet: GoogleSheet;
}

export default function DeleteConfirmDialog({ isOpen, onClose, onSuccess, sheet }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !sheet) return null;

  const handleDelete = async () => {
    setLoading(true);
    const toastId = toast.loading("Deleting sheet...");

    try {
      const { auth } = await import("@/lib/firebase");
      const idToken = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/sheets/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sheetId: sheet.id,
        }),
      });

      if (res.ok) {
        toast.success("Sheet deleted successfully", { id: toastId });
        onSuccess(); // Close the modal and deselect the sheet
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete sheet", { id: toastId });
      }
    } catch (error) {
      console.error("Delete sheet error:", error);
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-zinc-800 bg-red-50 dark:bg-red-900/10">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Delete Sheet
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-500" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">Delete &quot;{sheet.name}&quot;?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to permanently delete this Google Sheet? This action will move the file to the trash in Google Drive and remove it from the workspace for all users.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-[#202c33] px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-60"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete permanently"}
          </button>
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-zinc-700 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg transition disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
