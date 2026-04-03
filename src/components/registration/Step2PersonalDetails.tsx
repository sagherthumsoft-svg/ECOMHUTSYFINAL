"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { step2Schema, Step2FormData } from "@/lib/validationSchemas";

interface Step2Props {
  initialData: Step2FormData;
  onNext: (data: Step2FormData) => void;
  onBack: () => void;
}

const inputClass =
  "block w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all";

const errorInputClass =
  "block w-full px-4 py-3 rounded-xl border border-red-400 dark:border-red-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm transition-all";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-red-500"
    >
      <AlertCircle size={13} />
      <p className="text-xs">{message}</p>
    </motion.div>
  );
}

export default function Step2PersonalDetails({ initialData, onNext, onBack }: Step2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: initialData,
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <User size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Details</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Please fill in your accurate personal information.
        </p>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("firstName")}
              placeholder="Ali"
              className={errors.firstName ? errorInputClass : inputClass}
            />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("lastName")}
              placeholder="Khan"
              className={errors.lastName ? errorInputClass : inputClass}
            />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        {/* DOB */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            {...register("dateOfBirth")}
            type="date"
            className={errors.dateOfBirth ? errorInputClass : inputClass}
          />
          <FieldError message={errors.dateOfBirth?.message} />
        </div>

        {/* CNIC */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            CNIC <span className="text-red-500">*</span>
          </label>
          <input
            {...register("cnic")}
            placeholder="12345-1234567-1"
            className={errors.cnic ? errorInputClass : inputClass}
          />
          <FieldError message={errors.cnic?.message} />
        </div>

        {/* Mobile */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Personal Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            {...register("mobileNumber")}
            placeholder="03001234567"
            className={errors.mobileNumber ? errorInputClass : inputClass}
          />
          <FieldError message={errors.mobileNumber?.message} />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Personal Email <span className="text-red-500">*</span>
          </label>
          <input
            {...register("personalEmail")}
            type="email"
            placeholder="ali.khan@gmail.com"
            className={errors.personalEmail ? errorInputClass : inputClass}
          />
          <FieldError message={errors.personalEmail?.message} />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Complete Address <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("address")}
            rows={3}
            placeholder="House #123, Street 5, DHA Phase 2, Lahore, Pakistan"
            className={`${errors.address ? errorInputClass : inputClass} resize-none`}
          />
          <FieldError message={errors.address?.message} />
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium text-sm transition-all"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all"
          >
            Continue to Documents
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
