"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Mail, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface RegistrationSuccessProps {
  submissionId: string;
  email: string;
}

export default function RegistrationSuccess({ submissionId, email }: RegistrationSuccessProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center space-y-8 py-4"
    >
      {/* Success icon with pulse ring */}
      <div className="relative inline-flex">
        <motion.div
          className="absolute inset-0 bg-emerald-400/30 rounded-full"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 dark:shadow-emerald-900/40">
          <CheckCircle size={44} className="text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Application Submitted!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
          Your application has been received and is now pending HR review. This typically takes{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">1–3 business days</span>.
        </p>
      </div>

      {/* Status steps */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-5 text-left space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">What happens next?</p>

        {[
          {
            icon: <Clock size={16} className="text-amber-500" />,
            bg: "bg-amber-100 dark:bg-amber-900/30",
            title: "Under Review",
            desc: "HR team will review your documents and information.",
          },
          {
            icon: <Mail size={16} className="text-blue-500" />,
            bg: "bg-blue-100 dark:bg-blue-900/30",
            title: "Email Notification",
            desc: `You'll receive a decision email at ${email}`,
          },
          {
            icon: <CheckCircle size={16} className="text-emerald-500" />,
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            title: "Account Activation",
            desc: "Upon approval, login credentials will be emailed to you.",
          },
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 ${step.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {step.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reference ID */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Application Reference ID</p>
        <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 break-all">
          {submissionId}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Save this ID for tracking your application status.
        </p>
      </div>

      <button
        onClick={() => router.push("/login")}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold text-sm transition-all"
      >
        <Home size={16} />
        Back to Login
      </button>
    </motion.div>
  );
}
