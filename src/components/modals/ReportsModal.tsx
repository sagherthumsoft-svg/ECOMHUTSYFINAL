"use client";

import { X, BarChart3, DollarSign, Clock, Users, PieChart, TrendingUp, Download } from "lucide-react";
import toast from "react-hot-toast";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportsModal({ isOpen, onClose }: ReportsModalProps) {
  if (!isOpen) return null;

  const reportTypes = [
    { id: "expenses", label: "Expenses Report", icon: TrendingUp, color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" },
    { id: "salaries", label: "Salaries Report", icon: DollarSign, color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
    { id: "attendance", label: "Attendance Report", icon: Clock, color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
    { id: "staff", label: "Staff Performance", icon: Users, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { id: "inventory", label: "Inventory Analysis", icon: PieChart, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
  ];

  const handleReportClick = (label: string) => {
    toast.success(`${label} coming soon! 📊`, {
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            Reports Dashboard
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Generate and view detailed reports for your business operations. 
            All reports are currently in development.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => handleReportClick(report.label)}
                className="flex items-center p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-sm`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{report.label}</span>
                  <span className="text-xs text-slate-400">View analytics & data</span>
                </div>
                <Download className="w-4 h-4 ml-auto text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
