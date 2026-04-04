"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  User, 
  Files, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  X 
} from "lucide-react";

interface RequirementsModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RequirementsModal({ onConfirm, onCancel }: RequirementsModalProps) {
  const requirements = [
    {
      step: 1,
      title: "Profile Photo",
      icon: <User className="text-emerald-500" size={18} />,
      items: ["Professional headshot / Profile picture"]
    },
    {
      step: 2,
      title: "Personal Details",
      icon: <FileText className="text-blue-500" size={18} />,
      items: ["Full Name", "Date of Birth", "CNIC Number", "Mobile & Email", "Current Address"]
    },
    {
      step: 3,
      title: "Required Documents",
      icon: <Files className="text-amber-500" size={18} />,
      items: ["CNIC (Front & Back)", "Guardian CNIC Copy", "Last Degree Certificate", "Employment Form & Contract", "Professional Record Picture"]
    },
    {
      step: 4,
      title: "Guardian Info",
      icon: <ShieldCheck className="text-purple-500" size={18} />,
      items: ["Guardian Name & CNIC", "Guardian Mobile", "Emergency Contact"]
    },
    {
      step: 5,
      title: "Banking & Job",
      icon: <CreditCard className="text-teal-500" size={18} />,
      items: ["Bank Name", "IBAN Number", "Job Designation", "Reporting Manager", "Team Name"]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Requirements</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please ensure you have the following information ready before you begin.</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requirements.map((req) => (
              <div key={req.step} className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center">
                    {req.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Step {req.step}</span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{req.title}</h3>
                  </div>
                </div>
                <ul className="space-y-2">
                  {req.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 size={12} className="mt-0.5 text-emerald-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">Important:</span> You cannot save progress and return later. Your session will reset if you close the browser. Ensure you complete all <span className="font-bold">5 steps</span> in one sitting.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-6 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
          >
            I'll come back later
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[1.5] py-3 px-6 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40"
          >
            I have everything, let's start!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
