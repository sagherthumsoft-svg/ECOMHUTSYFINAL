"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { EmployeeStatus } from "@/types";
import { generateEmployeeId, logActivity, createNotification } from "@/lib/hrUtils";
import {
  Loader2, UserPlus, ChevronRight, Clock, CheckCircle, XCircle,
  FileText, Eye, X, Download, User, Phone, Mail, MapPin,
  CreditCard, Building, Calendar, Landmark, Shield, AlertTriangle
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

// ─── Pending Application Detail Panel ─────────────────────────────────────────
function PendingApplicationPanel({
  app,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}: {
  app: PendingUser;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  actionLoading: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  const DocLink = ({ label, url }: { label: string; url?: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          <Eye size={13} /> View
        </a>
      ) : (
        <span className="text-xs text-slate-400">Not provided</span>
      )}
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-zinc-900 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {app.profileImageUrl ? (
              <img src={app.profileImageUrl} alt={app.fullName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <User size={18} className="text-emerald-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{app.fullName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{app.personalEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Personal Details</h4>
            <div className="grid grid-cols-1 gap-3">
              <InfoRow icon={User} label="Full Name" value={app.fullName} />
              <InfoRow icon={Calendar} label="Date of Birth" value={app.dateOfBirth} />
              <InfoRow icon={CreditCard} label="CNIC" value={app.cnic} />
              <InfoRow icon={Phone} label="Mobile" value={app.mobileNumber} />
              <InfoRow icon={Mail} label="Email" value={app.personalEmail} />
              <InfoRow icon={MapPin} label="Address" value={app.address} />
            </div>
          </section>

          {/* Employment */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Employment Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={Building} label="Designation" value={app.designation} />
              <InfoRow icon={User} label="Team" value={app.teamName} />
              <InfoRow icon={Calendar} label="Joining Date" value={app.dateOfJoining} />
              <InfoRow icon={User} label="Reports To" value={app.reportingManager} />
            </div>
          </section>

          {/* Banking */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Banking</h4>
            <div className="grid grid-cols-1 gap-3">
              <InfoRow icon={Landmark} label="Bank" value={app.bankName} />
              <InfoRow icon={CreditCard} label="IBAN" value={app.ibanNumber} />
            </div>
          </section>

          {/* Guardian */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Guardian</h4>
            <div className="grid grid-cols-1 gap-3">
              <InfoRow icon={Shield} label="Name" value={app.guardianName} />
              <InfoRow icon={CreditCard} label="CNIC" value={app.guardianCnic} />
              <InfoRow icon={Phone} label="Mobile" value={app.guardianMobileNumber} />
              <InfoRow icon={MapPin} label="Address" value={app.guardianAddress} />
              <InfoRow icon={Phone} label="Emergency Contact" value={app.emergencyContactNumber} />
            </div>
          </section>

          {/* Documents */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Uploaded Documents</h4>
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl px-4">
              <DocLink label="CNIC Copy" url={app.cnicCopyUrl} />
              <DocLink label="Guardian CNIC Copy" url={app.guardianCnicCopyUrl} />
              <DocLink label="Last Degree Certificate" url={app.lastDegreeCertificateUrl} />
              <DocLink label="Employment Form" url={app.employmentFormUrl} />
              <DocLink label="Employment Contract" url={app.employmentContractUrl} />
              <DocLink label="Professional Picture For Record" url={app.professionalPictureUrl} />
            </div>
          </section>

          {/* Actions */}
          {app.status === "pending" && (
            <section className="space-y-3 pt-2">
              {!rejectMode ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => onApprove(app.id!)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg transition-all disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve & Create Account
                  </button>
                  <button
                    onClick={() => setRejectMode(true)}
                    disabled={actionLoading}
                    className="px-4 py-3 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-sm transition-all disabled:opacity-60"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Confirm Rejection</p>
                    </div>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Provide a clear reason for rejection (will be emailed to the applicant)…"
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRejectMode(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all">
                      Cancel
                    </button>
                    <button
                      onClick={() => { if (reason.trim()) onReject(app.id!, reason.trim()); }}
                      disabled={!reason.trim() || actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Reject Application
                    </button>
                  </div>
                </motion.div>
              )}
            </section>
          )}

          {app.status === "approved" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Application approved. Account credentials emailed to applicant.
              </p>
            </div>
          )}

          {app.status === "rejected" && (
            <div className="space-y-2">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={16} className="text-red-500" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Application Rejected</p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300 pl-6">{app.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
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

      {/* Slide-in detail panel */}
      <AnimatePresence>
        {selectedApp && (
          <PendingApplicationPanel
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            actionLoading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
