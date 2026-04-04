"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, Mail, Home, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { RegistrationFormData } from "@/types/registration";

interface RegistrationSuccessProps {
  submissionId: string;
  email: string;
  formData?: RegistrationFormData;
}

export default function RegistrationSuccess({ submissionId, email, formData }: RegistrationSuccessProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center space-y-8 py-4 no-print"
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

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
          >
            <Printer size={16} />
            Print Application
          </button>
          <button
            onClick={() => router.push("/login")}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border-2 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-all"
          >
            <Home size={16} />
            Back to Login
          </button>
        </div>
      </motion.div>

      {/* Printable version (hidden usually, shown for print) */}
      <div className="hidden print:block text-black p-6 bg-white border border-slate-300 rounded" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <img src="/assets/ecomhutsy-logo.png" alt="Logo" className="h-12 mb-2" />
            <h1 className="text-xl font-extrabold uppercase tracking-tight">Employment Application</h1>
            <p className="text-[10px] text-slate-500 mt-1">Reference ID: <span className="font-mono">{submissionId}</span></p>
          </div>
          <div className="text-right">
            <p className="font-bold text-base">ECOMHUTSY</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">HR Department</p>
            <p className="text-[10px] mt-1 font-semibold">{new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {formData && (
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Personal Information</h2>
              <div className="grid grid-cols-3 gap-y-2 gap-x-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">First Name</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.firstName}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Last Name</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.lastName}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">CNIC Number</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.cnic}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mobile Number</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.mobileNumber}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Email Address</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.personalEmail}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Date of Birth</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.dateOfBirth}</p>
                </div>
                <div className="col-span-3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Residential Address</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step2.address}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Employment & Banking</h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Designation</label>
                  <p className="text-[11px] font-semibold">{formData.step5.designation}</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Department / Team</label>
                  <p className="text-[11px] font-semibold">{formData.step5.teamName}</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Reporting Manager</label>
                  <p className="text-[11px] font-semibold">{formData.step5.reportingManager}</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Joining Date</label>
                  <p className="text-[11px] font-semibold">{formData.step5.dateOfJoining}</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Bank Name</label>
                  <p className="text-[11px] font-semibold">{formData.step5.bankName}</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">IBAN Number</label>
                  <p className="text-[11px] font-semibold font-mono">{formData.step5.ibanNumber}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Guardian & Emergency</h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Name</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step4.guardianName}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Guardian CNIC</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step4.guardianCnic}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Contact</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step4.guardianMobileNumber}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Emergency Contact</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step4.emergencyContactNumber}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Address</label>
                  <p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{formData.step4.guardianAddress}</p>
                </div>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <div className="flex justify-between items-end">
                <div className="w-48 text-center">
                  <div className="border-b border-slate-900 pb-3 mb-1"></div>
                  <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Applicant Signature</p>
                </div>
                <div className="w-48 text-center">
                  <div className="border-b border-slate-900 pb-3 mb-1"></div>
                  <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">HR Manager Signature</p>
                </div>
              </div>
              <p className="mt-6 text-center text-[8px] text-slate-400 uppercase tracking-[0.2em]">
                This application was generated on the EcomHutsy Portal.
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
            background: none !important;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .print\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
