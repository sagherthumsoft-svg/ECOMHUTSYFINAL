"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Step {
  number: number;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Profile", icon: "📸" },
  { number: 2, label: "Personal", icon: "👤" },
  { number: 3, label: "Documents", icon: "📄" },
  { number: 4, label: "Guardian", icon: "🛡️" },
  { number: 5, label: "Banking", icon: "🏦" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full px-2 py-4">
      {/* Step dots + connecting lines */}
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full z-0" />

        {/* Animated progress fill */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full z-0"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <div key={step.number} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{
                  scale: isActive ? 1.15 : 1,
                  backgroundColor: isCompleted
                    ? "#10b981"
                    : isActive
                    ? "#10b981"
                    : undefined,
                }}
                transition={{ duration: 0.3 }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  border-2 transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                      ? "bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-200 dark:ring-emerald-900"
                      : "bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-400"
                  }
                `}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span>{step.icon}</span>
                )}
              </motion.div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isCompleted
                    ? "text-emerald-500"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step counter */}
      <div className="mt-4 text-center">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Step{" "}
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {currentStep}
          </span>{" "}
          of {STEPS.length}
        </span>
      </div>
    </div>
  );
}
