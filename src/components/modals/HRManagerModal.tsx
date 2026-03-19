"use client";

import { X, Briefcase, FileText, Megaphone, UserPlus, Users, DollarSign, Clock, FolderOpen, HeartHandshake } from "lucide-react";
import toast from "react-hot-toast";

interface HRManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HRManagerModal({ isOpen, onClose }: HRManagerModalProps) {
  if (!isOpen) return null;

  const hrFeatures = [
    { id: "notice", label: "Create Notice", icon: FileText, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { id: "announcement", label: "Create Announcement", icon: Megaphone, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
    { id: "hiring", label: "New Hiring", icon: UserPlus, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
    { id: "staff", label: "Staff Management", icon: Users, color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" },
    { id: "salaries", label: "Salaries", icon: DollarSign, color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
    { id: "attendance", label: "Attendance", icon: Clock, color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
    { id: "records", label: "Record Management", icon: FolderOpen, color: "bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400" },
  ];

  const handleFeatureClick = (label: string) => {
    toast.success(`${label} coming soon! 🚀`, {
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
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            HR Manager
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
            Welcome to the HR Management portal. Select a feature below to get started. 
            Note: All features are currently in development.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hrFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature.label)}
                className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200 group text-center"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feature.label}</span>
              </button>
            ))}
            
            {/* Placeholder for more */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-zinc-800/20 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl opacity-60">
               <HeartHandshake className="w-10 h-10 text-slate-300 dark:text-zinc-700 mb-3" />
               <span className="text-xs font-medium text-slate-400">More coming soon</span>
            </div>
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
