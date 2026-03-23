"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileSpreadsheet } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { formatDistanceToNow } from "date-fns";
import { GoogleSheet } from "@/types/sheets";

interface SheetsSidebarProps {
  onSelectSheet: (sheet: GoogleSheet) => void;
  selectedSheetId?: string;
  onCreateClick: () => void;
}

export default function SheetsSidebar({ onSelectSheet, selectedSheetId, onCreateClick }: SheetsSidebarProps) {
  const { dbUser } = useUserStore();
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbUser?.uid || !db) return;

    // Listen to all active sheets
    const q = query(
      collection(db, "sheets"),
      where("isActive", "==", true),
      orderBy("lastUpdatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSheets = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as GoogleSheet[];

      // Filter based on access permissions
      const isSuper = dbUser.role === "owner" || dbUser.role === "head";
      const accessibleSheets = allSheets.filter(sheet => {
        return isSuper ||
          sheet.createdBy === dbUser.uid ||
          sheet.assignedUsers?.includes(dbUser.uid) ||
          sheet.permissions?.canEdit?.includes(dbUser.uid) ||
          sheet.permissions?.canView?.includes(dbUser.uid);
      });

      setSheets(accessibleSheets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dbUser]);

  const unfilteredRecent = sheets.slice(0, 4);
  const unfilteredAll = sheets.slice(4);

  const filteredRecent = unfilteredRecent.filter(sheet =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAll = unfilteredAll.filter(sheet =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasAnyMatches = filteredRecent.length > 0 || filteredAll.length > 0;

  const SheetItem = ({ sheet, isRecent }: { sheet: GoogleSheet, isRecent?: boolean }) => (
    <button
      key={`${isRecent ? 'recent' : 'all'}-${sheet.id}`}
      onClick={() => onSelectSheet(sheet)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group
        ${selectedSheetId === sheet.id
          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
          : "hover:bg-slate-100 dark:hover:bg-[#202c33] border-transparent"
        } border mb-1`}
    >
      <div className={`p-2 rounded-lg shrink-0
        ${selectedSheetId === sheet.id ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-white dark:bg-zinc-800 text-emerald-500 dark:text-emerald-400 group-hover:bg-white dark:group-hover:bg-zinc-700"}`}
      >
        <FileSpreadsheet className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`font-semibold text-sm truncate 
             ${selectedSheetId === sheet.id ? "text-emerald-900 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
            {sheet.name}
          </h4>
          {sheet.createdBy === dbUser?.uid && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300">
              OWNER
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate uppercase tracking-tighter font-bold opacity-70">
            {sheet.templateType || 'Custom'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {sheet.lastUpdatedAt?.toDate ? formatDistanceToNow(sheet.lastUpdatedAt.toDate(), { addSuffix: true }) : "just now"}
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#111b21]">
      {/* Search & Header */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sheets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
          />
        </div>

        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-sm shadow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Spreadsheet
        </button>
      </div>

      {/* Sheet List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasAnyMatches ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? `No matches for "${searchQuery}"` : "No sheets found in your workspace."}
            </p>
          </div>
        ) : (
          <>
            {/* Recently Created or Used */}
            {filteredRecent.length > 0 && (
              <div className="space-y-3">
                <h5 className="px-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                  Recently Created or Used
                </h5>
                <div className="space-y-1">
                  {filteredRecent.map(sheet => (
                    <SheetItem key={`recent-${sheet.id}`} sheet={sheet} isRecent />
                  ))}
                </div>
              </div>
            )}

            {/* All Spreadsheets */}
            {filteredAll.length > 0 && (
              <div className="space-y-3">
                <h5 className="px-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                  {searchQuery ? "More Results" : "All Spreadsheets"}
                </h5>
                <div className="space-y-1">
                  {filteredAll.map(sheet => (
                    <SheetItem key={`all-${sheet.id}`} sheet={sheet} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
