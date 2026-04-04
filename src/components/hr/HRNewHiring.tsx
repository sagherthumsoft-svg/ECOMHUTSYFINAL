"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { EmployeeStatus } from "@/types";
import { generateEmployeeId, logActivity, createNotification } from "@/lib/hrUtils";
import { isAdmin, cn } from "@/lib/utils";
import {
  Loader2, UserPlus, ChevronRight, Clock, CheckCircle, XCircle,
  FileText, Eye, X, Download, User, Phone, Mail, MapPin, Printer, FilePlus2,
  CreditCard, Building, Calendar, Landmark, Shield, AlertTriangle, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PendingUser } from "@/types/registration";
import { TEAMS } from "@/lib/constants";

// ─── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = TEAMS;
const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "inactive", label: "Inactive" },
];

interface HRNewHiringProps { onSuccess?: () => void; }

// ─── Pending Application Detail Modal ─────────────────────────────────────────
function PendingApplicationModal({
  app,
  onClose,
  onApprove,
  onReject,
  onUpdate,
  actionLoading,
  role,
}: {
  app: PendingUser;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onUpdate: (id: string, data: Partial<PendingUser>) => Promise<void>;
  actionLoading: boolean;
  role?: string;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reason, setReason] = useState("");
  const [editData, setEditData] = useState<Partial<PendingUser>>(app);
  const [saving, setSaving] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(app.id!, editData);
      setEditMode(false);
      toast.success("Application details updated");
    } catch (err) {
      toast.error("Failed to update application");
    } finally {
      setSaving(false);
    }
  };

  const DocLink = ({ label, url }: { label: string; url?: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          <Eye size={12} /> View
        </a>
      ) : (
        <span className="text-[10px] text-slate-400 italic">Not provided</span>
      )}
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value, field }: { icon: any; label: string; value: string; field?: keyof PendingUser }) => {
    const isEditable = editMode && field;
    
    return (
      <div 
        className={cn(
          "flex items-start gap-4 p-3 rounded-2xl transition-all duration-300 group",
          isEditable ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-1 ring-emerald-200 dark:ring-emerald-800" : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
        )}
      >
        <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
          <Icon size={18} className={cn("transition-colors", isEditable ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-0.5">{label}</p>
          {isEditable ? (
            <input
              type="text"
              autoFocus
              className="w-full text-sm font-bold bg-transparent border-b-2 border-emerald-500 focus:outline-none text-slate-900 dark:text-white"
              value={(editData as any)[field] || ""}
              onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
            />
          ) : (
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{value || "Not Entered"}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 text-slate-900">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-[32px] overflow-hidden flex flex-col max-h-[92vh] border border-white/20 dark:border-zinc-800 no-print"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative">
                {app.profileImageUrl ? (
                  <img src={app.profileImageUrl} alt={app.fullName} className="w-14 h-14 rounded-2xl object-cover shadow-md ring-2 ring-white dark:ring-zinc-800" />
                ) : (
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center ring-2 ring-white dark:ring-zinc-800">
                    <User size={26} className="text-emerald-600" />
                  </div>
                )}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-[3px] border-white dark:border-zinc-900 shadow-sm",
                    app.status === "pending" ? "bg-amber-400" : app.status === "approved" ? "bg-emerald-500" : "bg-red-500"
                  )} 
                />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                {editMode ? (
                  <div className="flex gap-2">
                    <input
                      className="w-40 bg-emerald-50/50 dark:bg-emerald-950/30 border-b-2 border-emerald-500 outline-none px-2 py-1 rounded-sm"
                      value={editData.firstName || ""}
                      placeholder="First Name"
                      onChange={(e) => {
                        const newFirst = e.target.value;
                        setEditData({
                          ...editData,
                          firstName: newFirst,
                          fullName: `${newFirst} ${editData.lastName || ""}`
                        });
                      }}
                    />
                    <input
                      className="w-40 bg-emerald-50/50 dark:bg-emerald-950/30 border-b-2 border-emerald-500 outline-none px-2 py-1 rounded-sm"
                      value={editData.lastName || ""}
                      placeholder="Last Name"
                      onChange={(e) => {
                        const newLast = e.target.value;
                        setEditData({
                          ...editData,
                          lastName: newLast,
                          fullName: `${editData.firstName || ""} ${newLast}`
                        });
                      }}
                    />
                  </div>
                ) : app.fullName}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.1em] mt-1 opacity-70">
                Application Review • Reference ID: <span className="font-mono">{app.id?.slice(-8)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="p-3 rounded-2xl bg-white dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:shadow-lg transition-all border border-slate-100 dark:border-zinc-700"
              title="Print Application"
            >
              <Printer size={20} />
            </button>
            {isAdmin(role) && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={cn(
                  "p-3 rounded-2xl transition-all border shadow-sm",
                  editMode 
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-200" 
                    : "bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600"
                )}
                title="Edit Application"
              >
                <FilePlus2 size={20} />
              </button>
            )}
            <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700 mx-2" />
            <button onClick={onClose} className="p-3 rounded-2xl bg-white dark:bg-zinc-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-zinc-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 dark:bg-zinc-950/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Personal Section */}
              <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-5">
                  <User size={12} className="text-blue-500" /> Personal Profile
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <InfoRow icon={Calendar} label="Date of Birth" value={app.dateOfBirth} field="dateOfBirth" />
                  <InfoRow icon={CreditCard} label="CNIC Number" value={app.cnic} field="cnic" />
                  <InfoRow icon={Phone} label="Mobile Number" value={app.mobileNumber} field="mobileNumber" />
                  <InfoRow icon={Mail} label="Contact Email" value={app.personalEmail} field="personalEmail" />
                  <InfoRow icon={MapPin} label="Residential Address" value={app.address} field="address" />
                </div>
              </div>

              {/* Banking Section */}
              <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-5">
                  <Landmark size={12} className="text-teal-500" /> Financial Info
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <InfoRow icon={Building} label="Bank Institution" value={app.bankName} field="bankName" />
                  <InfoRow icon={CreditCard} label="IBAN Number" value={app.ibanNumber} field="ibanNumber" />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Job Section */}
              <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-5">
                  <Building size={12} className="text-purple-500" /> Career Profile
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <InfoRow icon={Shield} label="Designation" value={app.designation} field="designation" />
                  <InfoRow icon={User} label="Departmental Team" value={app.teamName} field="teamName" />
                  <InfoRow icon={Calendar} label="Expected Joining" value={app.dateOfJoining} field="dateOfJoining" />
                  <InfoRow icon={User} label="Line Manager" value={app.reportingManager} field="reportingManager" />
                </div>
              </div>

              {/* Guardian Section */}
              <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-5">
                  <Shield size={12} className="text-amber-500" /> Guardian Details
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <InfoRow icon={User} label="Guardian Name" value={app.guardianName} field="guardianName" />
                  <InfoRow icon={CreditCard} label="Guardian CNIC" value={app.guardianCnic} field="guardianCnic" />
                  <InfoRow icon={Phone} label="Emergency Contact" value={app.emergencyContactNumber} field="emergencyContactNumber" />
                  <InfoRow icon={MapPin} label="Guardian Residence" value={app.guardianAddress} field="guardianAddress" />
                </div>
              </div>

              {/* Documents */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200 dark:shadow-none">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  <FileText size={12} className="text-emerald-400" /> Verification Docs
                </h4>
                <div className="space-y-1">
                  <DocLink label="CNIC FRONT" url={app.cnicFrontUrl} />
                  <DocLink label="CNIC BACK" url={app.cnicBackUrl} />
                  <DocLink label="GUARDIAN CNIC" url={app.guardianCnicCopyUrl} />
                  <DocLink label="LAST DEGREE" url={app.lastDegreeCertificateUrl} />
                  <DocLink label="EMPLOYMENT FORM" url={app.employmentFormUrl} />
                  <DocLink label="EMPLOYMENT CONTRACT" url={app.employmentContractUrl} />
                  <DocLink label="RECORD PICTURE" url={app.professionalPictureUrl} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
          <div className="flex gap-3">
            {app.status === "pending" && !editMode && isAdmin(role) && (
              <>
                {!rejectMode ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(app.id!)}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Approve Application
                    </button>
                    <button
                      onClick={() => setRejectMode(true)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-all flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-2xl pr-3 border border-red-100 dark:border-red-900/40">
                    <input
                      className="px-4 py-2 text-xs rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-red-400 w-64 text-slate-900 dark:text-white"
                      placeholder="Reason for rejection..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <button onClick={() => { if (reason) onReject(app.id!, reason); }} disabled={actionLoading || !reason} className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
                      <XCircle size={16} />
                    </button>
                    <button onClick={() => setRejectMode(false)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {editMode && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Save All Changes
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50"
                >
                  Discard
                </button>
              </div>
            )}

            {app.status === "approved" && <StatusBadge status="approved" />}
            {app.status === "rejected" && <StatusBadge status="rejected" />}
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
            Internal HR Review Document
          </div>
        </div>
      </motion.div>

      {/* Printable version for A4 (rendered during print only) */}
      <div className="hidden print:block text-black p-6 bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <img src="/assets/ecomhutsy-logo.png" alt="Logo" className="h-12 mb-2" />
            <h1 className="text-xl font-extrabold uppercase tracking-tight">Employment Application</h1>
            <p className="text-[10px] text-slate-500 mt-1">Reference ID: <span className="font-mono">{app.id}</span></p>
          </div>
          <div className="text-right">
            <p className="font-bold text-base">ECOMHUTSY</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">HR Department</p>
            <p className="text-[10px] mt-1 font-semibold">{new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Personal Information</h2>
            <div className="grid grid-cols-3 gap-y-2 gap-x-4">
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">First Name</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.firstName}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">LastName</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.lastName}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">CNIC Number</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.cnic}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Mobile Number</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.mobileNumber}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Email Address</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.personalEmail}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Date of Birth</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.dateOfBirth}</p></div>
              <div className="col-span-3"><label className="text-[9px] font-bold text-slate-400 uppercase">Residential Address</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.address}</p></div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Employment & Banking</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Designation</label><p className="text-[11px] font-semibold">{app.designation}</p></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Team</label><p className="text-[11px] font-semibold">{app.teamName}</p></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Manager</label><p className="text-[11px] font-semibold">{app.reportingManager}</p></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Joining Date</label><p className="text-[11px] font-semibold">{app.dateOfJoining}</p></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Bank</label><p className="text-[11px] font-semibold">{app.bankName}</p></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase">IBAN</label><p className="text-[11px] font-semibold font-mono">{app.ibanNumber}</p></div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold border-b border-slate-300 mb-2 pb-0.5 uppercase text-slate-700 tracking-wider">Guardian & Emergency</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Name</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.guardianName}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Guardian CNIC</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.guardianCnic}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Contact</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.guardianMobileNumber}</p></div>
              <div><label className="text-[9px] font-bold text-slate-400 uppercase">Emergency Contact</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.emergencyContactNumber}</p></div>
              <div className="col-span-2"><label className="text-[9px] font-bold text-slate-400 uppercase">Guardian Address</label><p className="text-[11px] font-semibold border-b border-slate-100 pb-0.5">{app.guardianAddress}</p></div>
            </div>
          </section>

          <footer className="mt-8 pt-6 border-t-2 border-slate-200">
            <div className="flex justify-between items-end">
              <div className="w-48 text-center"><div className="border-b border-slate-900 pb-3 mb-1"></div><p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Applicant Signature</p></div>
              <div className="w-48 text-center"><div className="border-b border-slate-900 pb-3 mb-1"></div><p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">HR Manager Signature</p></div>
            </div>
            <p className="mt-6 text-center text-[8px] text-slate-400 uppercase tracking-[0.2em]">This application was approved and verified on the EcomHutsy Portal.</p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          body * { visibility: hidden; background: none !important; }
          .print\:block, .print\:block * { visibility: visible; }
          .print\:block { position: absolute; left: 0; top: 0; width: 100%; border: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    approved: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={11} />,
    approved: <CheckCircle size={11} />,
    rejected: <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] ?? ""}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HRNewHiring({ onSuccess }: HRNewHiringProps) {
  const { dbUser } = useUserStore();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"form" | "pending">("pending");

  // ── Legacy hire form ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", fatherName: "", phone: "", email: "", cnic: "",
    address: "", department: "", role: "", salary: "",
    joiningDate: new Date().toISOString().split("T")[0],
    status: "active" as EmployeeStatus,
  });
  const setField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  // ── Pending applications ───────────────────────────────────────────────────
  const [pendingApps, setPendingApps] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<PendingUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    const q = query(collection(db, "pending_users"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingUser));
      setPendingApps(apps);
      setPendingLoading(false);
    }, (err) => {
      console.error("Pending users listener:", err);
      setPendingLoading(false);
    });
    return () => unsub();
  }, []);

  const pendingCount = pendingApps.filter((a) => a.status === "pending").length;

  const filteredApps = filterStatus === "all"
    ? pendingApps
    : pendingApps.filter((a) => a.status === filterStatus);

  const getIdToken = async () => {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  };

  const handleApprove = async (submissionId: string) => {
    setActionLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      toast.success(`✅ Account created! Employee ID: ${data.employeeId}`);
      setSelectedApp(null);
      await logActivity("APPROVE", "pending_users", `Approved application ${submissionId}`, dbUser?.uid || "", dbUser?.name || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (submissionId: string, reason: string) => {
    setActionLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/reject-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submissionId, reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Application rejected and applicant notified.");
      setSelectedApp(null);
      await logActivity("REJECT", "pending_users", `Rejected application ${submissionId}: ${reason}`, dbUser?.uid || "", dbUser?.name || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSubmission = async (id: string, data: Partial<PendingUser>) => {
    try {
      const docRef = doc(db, "pending_users", id);
      await updateDoc(docRef, data);
      await logActivity("UPDATE", "pending_users", `Updated application ${id} fields: ${Object.keys(data).join(", ")}`, dbUser?.uid || "", dbUser?.name || "");
    } catch (err: any) {
      console.error("Update error:", err);
      throw err;
    }
  };

  // ── Legacy hire form submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.phone.trim()) return toast.error("Phone is required");
    if (!form.department) return toast.error("Department is required");
    if (!form.role.trim()) return toast.error("Role/Position is required");
    if (!form.salary || isNaN(Number(form.salary)) || Number(form.salary) <= 0) return toast.error("Valid salary is required");
    if (!form.joiningDate) return toast.error("Joining date is required");
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) return toast.error("Enter a valid phone number");
    if (form.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(form.cnic.trim())) return toast.error("CNIC format: 12345-1234567-1");

    setLoading(true);
    try {
      const employeeId = await generateEmployeeId();
      const existingQ = query(collection(db, "employees"), where("employeeId", "==", employeeId));
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) { toast.error("Employee ID conflict. Retry."); setLoading(false); return; }

      await addDoc(collection(db, "employees"), {
        employeeId, name: form.name.trim(), fatherName: form.fatherName.trim(),
        phone: form.phone.trim(), email: form.email.trim(), cnic: form.cnic.trim(),
        address: form.address.trim(), department: form.department, role: form.role.trim(),
        salary: Number(form.salary), joiningDate: form.joiningDate, status: form.status,
        createdAt: Date.now(), createdBy: dbUser?.uid || "",
      });

      await logActivity("CREATE", "employees", `Created employee ${form.name} (${employeeId})`, dbUser?.uid || "", dbUser?.name || "");
      await createNotification([dbUser?.uid || ""], "New Employee", `${form.name} added as ${form.role} in ${form.department}`);
      toast.success(`Employee ${form.name} (${employeeId}) registered!`);
      setForm({ name: "", fatherName: "", phone: "", email: "", cnic: "", address: "", department: "", role: "", salary: "", joiningDate: new Date().toISOString().split("T")[0], status: "active" });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to register employee");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm transition";
  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-emerald-50 dark:bg-emerald-900/10">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>HR Manager</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">New Hiring</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-zinc-800 shrink-0 px-4 pt-2 gap-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${activeTab === "pending" ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <Clock size={15} />
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("form")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${activeTab === "form" ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          <UserPlus size={15} />
          Manual Entry
        </button>
      </div>

      {/* ── Tab: Pending Approvals ── */}
      {activeTab === "pending" && (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-5">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterStatus === s ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"}`}
              >
                {s === "all" ? `All (${pendingApps.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${pendingApps.filter(a => a.status === s).length})`}
              </button>
            ))}
          </div>

          {pendingLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p className="font-semibold text-slate-500">No applications found</p>
              <p className="text-sm mt-1">
                {filterStatus === "pending" ? "All applications have been reviewed." : "No applications in this category."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedApp(app)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800/60 rounded-2xl border border-slate-100 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer transition-all group"
                >
                  {app.profileImageUrl ? (
                    <img src={app.profileImageUrl} alt={app.fullName} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{app.fullName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{app.designation} · {app.teamName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{app.personalEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge status={app.status} />
                    <p className="text-[11px] text-slate-400">
                      {new Date(app.submittedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Manual Entry Form ── */}
      {activeTab === "form" && (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Full Name <span className="text-red-500">*</span></label><input className={inputClass} placeholder="Muhammad Ali" value={form.name} onChange={(e) => setField("name", e.target.value)} required /></div>
                <div><label className={labelClass}>Father's Name</label><input className={inputClass} placeholder="Muhammad Saleem" value={form.fatherName} onChange={(e) => setField("fatherName", e.target.value)} /></div>
                <div><label className={labelClass}>Phone <span className="text-red-500">*</span></label><input className={inputClass} placeholder="03XX-XXXXXXX" value={form.phone} onChange={(e) => setField("phone", e.target.value)} required /></div>
                <div><label className={labelClass}>Email</label><input type="email" className={inputClass} placeholder="ali@company.com" value={form.email} onChange={(e) => setField("email", e.target.value)} /></div>
                <div><label className={labelClass}>CNIC <span className="text-slate-300 normal-case font-normal">(optional)</span></label><input className={inputClass} placeholder="12345-1234567-1" value={form.cnic} onChange={(e) => setField("cnic", e.target.value)} /></div>
                <div><label className={labelClass}>Address</label><input className={inputClass} placeholder="House #, Street, City" value={form.address} onChange={(e) => setField("address", e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-600" /> Job Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Department <span className="text-red-500">*</span></label>
                  <select className={inputClass} value={form.department} onChange={(e) => setField("department", e.target.value)} required>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div><label className={labelClass}>Role / Position <span className="text-red-500">*</span></label><input className={inputClass} placeholder="e.g. Sales Agent" value={form.role} onChange={(e) => setField("role", e.target.value)} required /></div>
                <div><label className={labelClass}>Monthly Salary (PKR) <span className="text-red-500">*</span></label><input type="number" min="0" className={inputClass} placeholder="e.g. 35000" value={form.salary} onChange={(e) => setField("salary", e.target.value)} required /></div>
                <div><label className={labelClass}>Joining Date <span className="text-red-500">*</span></label><input type="date" className={inputClass} value={form.joiningDate} onChange={(e) => setField("joiningDate", e.target.value)} required /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Status</label>
                  <div className="flex gap-2">{STATUSES.map((s) => (<button key={s.value} type="button" onClick={() => setField("status", s.value)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition ${form.status === s.value ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-zinc-700 text-slate-500 hover:border-slate-300"}`}>{s.label}</button>))}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? "Registering…" : "Register Employee"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Center Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <PendingApplicationModal
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            onUpdate={handleUpdateSubmission}
            actionLoading={actionLoading}
            role={dbUser?.role}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
