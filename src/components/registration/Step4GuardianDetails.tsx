"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Shield, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { step4Schema, Step4FormData } from "@/lib/validationSchemas";

interface Step4Props {
  initialData: Step4FormData;
  onNext: (data: Step4FormData) => void;
  onBack: () => void;
}

const inputClass =
  "block w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all";
const errorInputClass =
  "block w-full px-4 py-3 rounded-xl border border-red-400 dark:border-red-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm transition-all";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-red-500">
      <AlertCircle size={13} />
      <p className="text-xs">{message}</p>
    </motion.div>
  );
}

export default function Step4GuardianDetails({ initialData, onNext, onBack }: Step4Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: initialData,
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Shield size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Guardian Details</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Emergency contact and guardian information for our records.
        </p>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Name <span className="text-red-500">*</span></label>
          <input {...register("guardianName")} placeholder="Muhammad Raza" className={errors.guardianName ? errorInputClass : inputClass} />
          <FieldError message={errors.guardianName?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian CNIC <span className="text-red-500">*</span></label>
          <input {...register("guardianCnic")} placeholder="12345-1234567-1" className={errors.guardianCnic ? errorInputClass : inputClass} />
          <FieldError message={errors.guardianCnic?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Mobile Number <span className="text-red-500">*</span></label>
          <input {...register("guardianMobileNumber")} placeholder="03001234567" className={errors.guardianMobileNumber ? errorInputClass : inputClass} />
          <FieldError message={errors.guardianMobileNumber?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Address <span className="text-red-500">*</span></label>
          <textarea {...register("guardianAddress")} rows={3} placeholder="Complete residential address" className={`${errors.guardianAddress ? errorInputClass : inputClass} resize-none`} />
          <FieldError message={errors.guardianAddress?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Emergency Contact Number <span className="text-red-500">*</span></label>
          <input {...register("emergencyContactNumber")} placeholder="03001234567" className={errors.emergencyContactNumber ? errorInputClass : inputClass} />
          <FieldError message={errors.emergencyContactNumber?.message} />
          <p className="text-xs text-slate-400 dark:text-slate-500 pl-1">Can be different from guardian mobile (e.g., alternate relative)</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium text-sm transition-all">
            <ArrowLeft size={16} />
            Back
          </button>
          <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all">
            Continue to Banking Info
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
