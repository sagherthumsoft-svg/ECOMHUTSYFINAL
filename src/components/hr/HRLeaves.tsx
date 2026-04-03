"use client";

import { useState } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHRLeaves } from "@/hooks/useHRLeaves";
import { useHREmployees } from "@/hooks/useHREmployees";
import { Leave, LeaveType } from "@/types";
import { logActivity, daysBetween } from "@/lib/hrUtils";
import {
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  pending:  { label: "Pending",  bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400" },
  approved: { label: "Approved", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  rejected: { label: "Rejected", bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-400" },
};

export default function HRLeaves() {
  const { dbUser } = useUserStore();
  const { leaves, loading } = useHRLeaves();
  const { employees } = useHREmployees();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "sick" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const filteredLeaves = leaves.filter(
    (l) => filterStatus === "All" || l.status === filterStatus
  );

  const selectedEmployee = employees.find((e) => e.employeeId === form.employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.startDate || !form.endDate) return toast.error("Dates are required");
    if (form.endDate < form.startDate) return toast.error("End date must be after start date");
    if (!form.reason.trim()) return toast.error("Reason is required");

    setSubmitting(true);
    try {
      const leaveData: Omit<Leave, "id"> = {
        employeeId: form.employeeId,
        employeeName: selectedEmployee?.name || "",
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        status: "pending",
        createdAt: Date.now(),
        createdBy: dbUser?.uid || "",
      };

      await addDoc(collection(db, "leaves"), leaveData);
      await logActivity("CREATE", "leaves", `Created leave request for ${selectedEmployee?.name} (${form.leaveType})`, dbUser?.uid || "", dbUser?.name);

      toast.success("Leave request submitted");
      setForm({ employeeId: "", leaveType: "sick", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (leave: Leave, status: "approved" | "rejected") => {
    if (!leave.id) return;
    setReviewingId(leave.id);
    try {
      await updateDoc(doc(db, "leaves", leave.id), {
        status,
        reviewedBy: dbUser?.uid || "",
        reviewedAt: Date.now(),
      });
      await logActivity(
        "UPDATE",
        "leaves",
        `${status === "approved" ? "Approved" : "Rejected"} leave for ${leave.employeeName}`,
        dbUser?.uid || "",
        dbUser?.name
      );
      toast.success(`Leave ${status} for ${leave.employeeName}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-orange-50 dark:bg-orange-900/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>HR Manager</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-orange-600 dark:text-orange-400">Leave Management</span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Request"}
          </button>
        </div>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-orange-50/50 dark:bg-orange-900/5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Employee *</label>
              <select
                className={inputClass}
                value={form.employeeId}
                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                required
              >
                <option value="">Select employee</option>
                {employees.filter((e) => e.status !== "inactive").map((e) => (
                  <option key={e.employeeId} value={e.employeeId}>
                    {e.name} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Leave Type *</label>
              <select
                className={inputClass}
                value={form.leaveType}
                onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value as LeaveType }))}
              >
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Reason *</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Reason for leave…"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                required
              />
            </div>
            {form.startDate && form.endDate && (
              <div className="sm:col-span-2 text-xs text-orange-600 font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Duration: {daysBetween(form.startDate, form.endDate)} day(s)
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit Leave Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex gap-2">
        {["All", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${
              filterStatus === s
                ? "bg-orange-600 text-white"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {s === "All" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
            {s !== "All" && ` (${leaves.filter((l) => l.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Leaves List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Clock className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No leave requests</p>
          </div>
        ) : (
          filteredLeaves.map((leave) => {
            const sc = STATUS_CONFIG[leave.status];
            const isReviewing = reviewingId === leave.id;
            const days = daysBetween(leave.startDate, leave.endDate);

            return (
              <div
                key={leave.id}
                className="bg-white dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {leave.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{leave.employeeName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {LEAVE_TYPES.find((t) => t.value === leave.leaveType)?.label} ·{" "}
                      {leave.startDate} → {leave.endDate} ({days} day{days !== 1 ? "s" : ""})
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{leave.reason}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(leave.createdAt, { addSuffix: true })}
                  </span>

                  {leave.status === "pending" && (
                    <div className="flex gap-1.5">
                      {isReviewing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleReview(leave, "approved")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(leave, "rejected")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
