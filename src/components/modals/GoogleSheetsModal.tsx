"use client";

import { useState } from "react";
import { X, Menu } from "lucide-react";
import SheetsSidebar from "../sheets/SheetsSidebar";
import SheetEditor from "../sheets/SheetEditor";
import SheetToolbar from "../sheets/SheetToolbar";
import CreateSheetDialog from "../sheets/CreateSheetDialog";
import AssignUsersDialog from "../sheets/AssignUsersDialog";
import DeleteConfirmDialog from "../sheets/DeleteConfirmDialog";
import { GoogleSheet } from "@/types/sheets";

export default function GoogleSheetsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null);
  
  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Mobile Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-[1400px] h-full sm:h-[95vh] shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-[#202c33] z-10">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM17 19H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V9h10v2z"/>
              </svg>
              <span className="truncate">Sheets Workspace</span>
            </h2>
          </div>
          <button 
            onClick={() => { setSelectedSheet(null); onClose(); }} 
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar */}
          <div className={`absolute lg:relative flex-shrink-0 w-[280px] sm:w-[320px] h-full bg-slate-50 dark:bg-[#111b21] border-r border-slate-200 dark:border-zinc-800 z-20 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
             <SheetsSidebar 
                onSelectSheet={(sheet: GoogleSheet) => { setSelectedSheet(sheet); setIsSidebarOpen(false); }}
                selectedSheetId={selectedSheet?.id}
                onCreateClick={() => setIsCreateOpen(true)}
             />
          </div>
          
          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
             <div 
               className="absolute inset-0 bg-black/50 z-10 lg:hidden"
               onClick={() => setIsSidebarOpen(false)}
             />
          )}

          {/* Main Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0b141a]">
            {selectedSheet ? (
              <>
                <SheetToolbar 
                  sheet={selectedSheet}
                  onAssign={() => setIsAssignOpen(true)}
                  onDelete={() => setIsDeleteOpen(true)}
                />
                <div className="flex-1 overflow-hidden">
                   <SheetEditor sheet={selectedSheet} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
                <svg className="w-20 h-20 sm:w-24 sm:h-24 text-slate-300 dark:text-zinc-700 mb-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM17 19H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V9h10v2z"/>
                </svg>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Sheet Selected</h3>
                <p className="max-w-md">Select a sheet from the sidebar or create a new one to start editing data directly inside this workspace.</p>
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-lg"
                >
                  Create New Sheet
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <CreateSheetDialog 
          isOpen={isCreateOpen} 
          onClose={() => setIsCreateOpen(false)} 
          onSuccess={(sheet: GoogleSheet) => setSelectedSheet(sheet)}
        />
        
        {selectedSheet && (
          <>
            <AssignUsersDialog 
              isOpen={isAssignOpen} 
              onClose={() => setIsAssignOpen(false)} 
              sheet={selectedSheet} 
            />
            <DeleteConfirmDialog 
              isOpen={isDeleteOpen} 
              onClose={() => setIsDeleteOpen(false)} 
              sheet={selectedSheet}
              onSuccess={() => {
                setSelectedSheet(null);
                setIsDeleteOpen(false);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
