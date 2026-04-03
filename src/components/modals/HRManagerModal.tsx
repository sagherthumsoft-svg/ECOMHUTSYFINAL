"use client";

import { useState, useMemo } from "react";
import {
  X,
  Briefcase,
  FileText,
  Megaphone,
  UserPlus,
  Users,
  DollarSign,
  Clock,
  FolderOpen,
  TrendingUp,
  ChevronLeft,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useHRDataSync } from "@/hooks/useHRDataSync";

import HRDashboard from "@/components/hr/HRDashboard";
import HRNewHiring from "@/components/hr/HRNewHiring";
import HRStaffManagement from "@/components/hr/HRStaffManagement";
import HRAttendance from "@/components/hr/HRAttendance";
import HRSalaries from "@/components/hr/HRSalaries";
import HRLeaves from "@/components/hr/HRLeaves";
import HRAdvancesLoans from "@/components/hr/HRAdvancesLoans";
import HRNotices from "@/components/hr/HRNotices";
import HRAnnouncements from "@/components/hr/HRAnnouncements";
import HRRecords from "@/components/hr/HRRecords";

type HRView =
  | "home"
  | "hiring"
  | "staff"
  | "attendance"
  | "salaries"
  | "leaves"
  | "loans"
  | "notices"
  | "announcements"
  | "records";

interface HRManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VIEW_CONFIG: Record<HRView, { title: string; icon: React.ElementType; color: string }> = {
  home: { title: "HR Manager", icon: LayoutDashboard, color: "text-emerald-600" },
  hiring: { title: "New Hiring", icon: UserPlus, color: "text-emerald-600" },
  staff: { title: "Staff Management", icon: Users, color: "text-blue-600" },
  attendance: { title: "Attendance", icon: Clock, color: "text-red-600" },
  salaries: { title: "Salaries & Payroll", icon: DollarSign, color: "text-green-600" },
  leaves: { title: "Leave Management", icon: Clock, color: "text-orange-600" },
  loans: { title: "Advances & Loans", icon: TrendingUp, color: "text-purple-600" },
  notices: { title: "Notices", icon: FileText, color: "text-cyan-600" },
  announcements: { title: "Announcements", icon: Megaphone, color: "text-pink-600" },
  records: { title: "Record Management", icon: FolderOpen, color: "text-slate-600" },
};

export default function HRManagerModal({ isOpen, onClose }: HRManagerModalProps) {
  const { dbUser } = useUserStore();
  const [currentView, setCurrentView] = useState<HRView>("home");

  const isHRAdmin = useMemo(() =>
    dbUser?.role && ["owner", "manager", "head"].includes(dbUser.role),
    [dbUser?.role]);

  const { syncing, runCleanup } = useHRDataSync(!!isHRAdmin);

  if (!isOpen) return null;

  const config = VIEW_CONFIG[currentView];
  const Icon = config.icon;

  const handleNavigate = (view: string) => {
    setCurrentView(view as HRView);
  };

  const handleBack = () => {
    setCurrentView("home");
  };

  const handleClose = () => {
    setCurrentView("home");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[96vh] sm:h-[95vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-[#111b21]">
          <div className="flex items-center gap-3">
            {currentView !== "home" && (
              <button
                onClick={handleBack}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-1"
                title="Back to HR Dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
              <Briefcase className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">HR Manager</span>
                {currentView !== "home" && (
                  <>
                    <span className="text-slate-300 dark:text-zinc-600 text-sm">›</span>
                    <span className={`text-sm font-bold ${config.color}`}>{config.title}</span>
                  </>
                )}
              </div>
              {currentView === "home" && (
                <p className="text-[11px] text-slate-400">Human Resource Management Portal</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Button for Admins on Home View */}
            {currentView === "home" && isHRAdmin && (
              <button
                onClick={runCleanup}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                title="Cleanup invalid departments"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Data"}
              </button>
            )}

            {/* Quick nav pills for non-home views */}
            {currentView !== "home" && (
              <button
                onClick={handleBack}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                HR Dashboard
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {currentView === "home" && (
            <HRDashboard onNavigate={handleNavigate} />
          )}
          {currentView === "hiring" && (
            <HRNewHiring onSuccess={() => setCurrentView("staff")} />
          )}
          {currentView === "staff" && (
            <HRStaffManagement />
          )}
          {currentView === "attendance" && (
            <HRAttendance />
          )}
          {currentView === "salaries" && (
            <HRSalaries />
          )}
          {currentView === "leaves" && (
            <HRLeaves />
          )}
          {currentView === "loans" && (
            <HRAdvancesLoans />
          )}
          {currentView === "notices" && (
            <HRNotices />
          )}
          {currentView === "announcements" && (
            <HRAnnouncements />
          )}
          {currentView === "records" && (
            <HRRecords />
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={handleClose} />
    </div>
  );
}
