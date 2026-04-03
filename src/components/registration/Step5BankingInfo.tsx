"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Landmark, ArrowLeft, Send, AlertCircle, ChevronDown } from "lucide-react";
import { step5Schema, Step5FormData } from "@/lib/validationSchemas";
import { PAKISTANI_BANKS, TEAMS } from "@/lib/constants";

interface Step5Props {
  initialData: Step5FormData;
  onSubmit: (data: Step5FormData) => void;
  onBack: () => void;
  isSubmitting: boolean;
  uploadStatus: string;
}

const inputClass =
  "block w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all appearance-none";
const errorInputClass =
  "block w-full px-4 py-3 rounded-xl border border-red-400 dark:border-red-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm transition-all appearance-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-red-500">
      <AlertCircle size={13} />
      <p className="text-xs">{message}</p>
    </motion.div>
  );
}

export default function Step5BankingInfo({ initialData, onSubmit, onBack, isSubmitting, uploadStatus }: Step5Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step5FormData>({
    resolver: zodResolver(step5Schema),
    defaultValues: initialData,
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Landmark size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Banking & Job Info</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Final step — enter your banking and employment details.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date of Joining <span className="text-red-500">*</span></label>
          <input {...register("dateOfJoining")} type="date" className={errors.dateOfJoining ? errorInputClass : inputClass} />
          <FieldError message={errors.dateOfJoining?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bank Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <select {...register("bankName")} className={errors.bankName ? errorInputClass : inputClass}>
                <option value="">Select Bank</option>
                {PAKISTANI_BANKS.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <FieldError message={errors.bankName?.message} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Designation <span className="text-red-500">*</span></label>
            <input {...register("designation")} placeholder="Software Engineer" className={errors.designation ? errorInputClass : inputClass} />
            <FieldError message={errors.designation?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">IBAN Number <span className="text-red-500">*</span></label>
          <input {...register("ibanNumber")} placeholder="PK36SCBL0000001123456702" className={errors.ibanNumber ? errorInputClass : inputClass} />
          <FieldError message={errors.ibanNumber?.message} />
          <p className="text-xs text-slate-400 pl-1">Format: PK + 2 digits + 4 bank code letters + 16 digits</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reporting Head <span className="text-red-500">*</span></label>
          <div className="relative">
            <select {...register("reportingManager")} className={errors.reportingManager ? errorInputClass : inputClass}>
              <option value="">Select Reporting Head</option>
              {TEAMS.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <FieldError message={errors.reportingManager?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Team Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <select {...register("teamName")} className={errors.teamName ? errorInputClass : inputClass}>
              <option value="">Select Team</option>
              {TEAMS.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <FieldError message={errors.teamName?.message} />
        </div>

        {/* Submission status */}
        {isSubmitting && uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{uploadStatus}</p>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 pl-8">
              Securely uploading your documents — please do not close this page.
            </p>
          </motion.div>
        )}

        {/* Final disclaimer */}
        <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-700 dark:text-slate-300">📋 Before you submit</p>
          <p>• Your application will be reviewed by HR. You will NOT be able to login until approved.</p>
          <p>• A temporary password will be emailed to you upon approval.</p>
          <p>• All information provided is kept strictly confidential.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} disabled={isSubmitting} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium text-sm transition-all disabled:opacity-50">
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Application
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
