"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { GoogleSheet } from "@/types/sheets";
import { ExternalLink } from "lucide-react";

interface SheetEditorProps {
  sheet: GoogleSheet;
}

export default function SheetEditor({ sheet }: SheetEditorProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenSheet = async () => {
    setLoading(true);
    const toastId = toast.loading("Authorizing secure access...");
    try {
      const { auth } = await import("@/lib/firebase");
      const idToken = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/sheets/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ sheetId: sheet.id }),
      });

      const result = await res.json();
      if (res.ok && result.url) {
        toast.success("Access granted! Opening sheet...", { id: toastId });
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error || "Failed to open sheet", { id: toastId });
      }
    } catch (error) {
      console.error("Error opening sheet:", error);
      toast.error("Error opening sheet", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 h-full bg-slate-50 dark:bg-[#0b141a]">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ExternalLink className="w-10 h-10 ml-1" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Open in Google Sheets
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            For security and the best experience, this sheet opens natively in Google Sheets. You will be automatically granted secure access before redirection.
          </p>
        </div>
        <button
          onClick={handleOpenSheet}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
             <ExternalLink className="w-5 h-5" />
          )}
          {loading ? "Authorizing Access..." : "Open Sheet"}
        </button>
      </div>
    </div>
  );
}
