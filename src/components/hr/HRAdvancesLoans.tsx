"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHREmployees } from "@/hooks/useHREmployees";
import { Loan, LoanStatus } from "@/types";
import { getCurrentMonthString, logActivity, formatCurrency } from "@/lib/hrUtils";
import {
  ChevronRight,
  TrendingUp,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

type LoanType = "advance" | "loan";

export default function HRAdvancesLoans() {
  const { dbUser } = useUserStore();
  const { employees } = useHREmployees();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | LoanType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | LoanStatus>("all");

  const [form, setForm] = useState({
    employeeId: "",
    type: "advance" as LoanType,
    amount: "",
    installments: "1",
    startMonth: getCurrentMonthString(),
  });

  // Real-time loans subscription
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => { };

    try {
      const q = query(collection(db, "loans"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Loan[]);
          setLoading(false);
        },
        (err) => {
          if (!isMounted) return;
          console.error("HRAdvancesLoans Listener Error:", err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("HRAdvancesLoans Effect Error:", err);
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const selectedEmployee = employees.find((e) => e.employeeId === form.employeeId);
  const monthlyDeduction =
    form.amount && form.installments
      ? Math.ceil(Number(form.amount) / Number(form.installments))
      : 0;

  const filteredLoans = loans.filter((l) => {
    const typeMatch = filterType === "all" || l.type === filterType;
    const statusMatch = filterStatus === "all" || l.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Valid amount required");
    if (!form.installments || Number(form.installments) < 1) return toast.error("Installments must be at least 1");

    setSubmitting(true);
    try {
      const loanData: Omit<Loan, "id"> = {
        employeeId: form.employeeId,
        employeeName: selectedEmployee?.name || "",
        type: form.type,
        amount: Number(form.amount),
        installments: Number(form.installments),
        monthlyDeduction,
        remainingAmount: Number(form.amount),
        status: "active",
        startMonth: form.startMonth,
        createdAt: Date.now(),
        createdBy: dbUser?.uid || "",
      };

      await addDoc(collection(db, "loans"), loanData);
      await logActivity(
        "CREATE",
        "loans",
        `Created ${form.type} of PKR ${form.amount} for ${selectedEmployee?.name}`,
        dbUser?.uid || "",
        dbUser?.name
      );

      toast.success(`${form.type === "advance" ? "Advance" : "Loan"} created successfully!`);
      setForm({ employeeId: "", type: "advance", amount: "", installments: "1", startMonth: getCurrentMonthString() });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCleared = async (loan: Loan) => {
    if (!loan.id) return;
    try {
      await updateDoc(doc(db, "loans", loan.id), { status: "cleared", remainingAmount: 0 });
      await logActivity("UPDATE", "loans", `Marked ${loan.type} as cleared for ${loan.employeeName}`, dbUser?.uid || "", dbUser?.name);
      toast.success("Marked as cleared");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!loan.id) return;
    if (!confirm(`Delete this ${loan.type} record? This is permanent.`)) return;
    setDeletingId(loan.id);
    try {
      await deleteDoc(doc(db, "loans", loan.id));
      await logActivity("DELETE", "loans", `Deleted ${loan.type} for ${loan.employeeName}`, dbUser?.uid || "", dbUser?.name);
      toast.success("Record deleted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-purple-50 dark:bg-purple-900/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>HR Manager</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-purple-600 dark:text-purple-400">Advances & Loans</span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Record"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-purple-50/50 dark:bg-purple-900/5">
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
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {(["advance", "loan"] as LoanType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: t }))}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border-2 transition capitalize ${form.type === t
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                      : "border-slate-200 dark:border-zinc-700 text-slate-500 hover:border-slate-300"
                      }`}
                  >
                    {t === "advance" ? "Advance Salary" : "Loan"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Amount (PKR) *</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                placeholder="e.g. 10000"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Installments (months)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                className={inputClass}
                value={form.installments}
                onChange={(e) => setForm((p) => ({ ...p, installments: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Month</label>
              <input
                type="month"
                className={inputClass}
                value={form.startMonth}
                onChange={(e) => setForm((p) => ({ ...p, startMonth: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex gap-2 flex-wrap">
        {(["all", "advance", "loan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition capitalize ${filterType === t
              ? "bg-purple-600 text-white"
              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
          >
            {t === "all" ? "All" : t === "advance" ? "Advances" : "Loans"}
          </button>
        ))}
        <div className="h-5 border-r border-slate-200 dark:border-zinc-700 mx-1 self-center" />
        {(["all", "active", "cleared"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition capitalize ${filterStatus === s
              ? "bg-slate-600 text-white"
              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
          >
            {s === "all" ? "All Status" : s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No records found</p>
          </div>
        ) : (
          filteredLoans.map((loan) => (
            <div
              key={loan.id}
              className={`bg-white dark:bg-zinc-800/40 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-sm ${loan.status === "cleared"
                ? "border-emerald-200 dark:border-emerald-800/30 opacity-70"
                : loan.type === "loan"
                  ? "border-purple-200 dark:border-purple-800/30"
                  : "border-blue-200 dark:border-blue-800/30"
                }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${loan.type === "loan" ? "bg-purple-600" : "bg-blue-500"
                    }`}
                >
                  {loan.employeeName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    {loan.employeeName}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${loan.type === "loan"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                    >
                      {loan.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {loan.installments} month{loan.installments !== 1 ? "s" : ""} ·{" "}
                    {formatCurrency(loan.monthlyDeduction)}/month · Starts {loan.startMonth}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(loan.amount)}</div>
                  <div className="text-xs text-slate-400">
                    Remaining: <span className={loan.remainingAmount > 0 ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
                      {formatCurrency(loan.remainingAmount)}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${loan.status === "active"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                >
                  {loan.status}
                </span>

                <div className="flex gap-1">
                  {loan.status === "active" && (
                    <button
                      onClick={() => handleMarkCleared(loan)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="Mark as Cleared"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(loan)}
                    disabled={deletingId === loan.id}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === loan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
