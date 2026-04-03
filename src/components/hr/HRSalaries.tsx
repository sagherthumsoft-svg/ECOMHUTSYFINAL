"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHREmployees } from "@/hooks/useHREmployees";
import { useHRPayroll } from "@/hooks/useHRPayroll";
import { Employee, PayrollRecord } from "@/types";
import {
  getCurrentMonthString,
  formatCurrency,
  logActivity,
} from "@/lib/hrUtils";
import {
  ChevronRight,
  DollarSign,
  Loader2,
  Printer,
  Trash2,
  Plus,
  CalendarDays,
  TrendingDown,
  Gift,
} from "lucide-react";
import toast from "react-hot-toast";

export default function HRSalaries() {
  const { dbUser } = useUserStore();
  const { employees, loading: empLoading } = useHREmployees();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const { records, loading: payLoading } = useHRPayroll(selectedMonth);

  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Map of employeeId -> payroll record for selected month
  const payrollMap = new Map(records.map((r) => [r.employeeId, r]));

  // Active employees not yet on payroll this month
  const unpaidEmployees = employees.filter(
    (e) => e.status !== "inactive" && !payrollMap.has(e.employeeId)
  );

  const generatePayroll = async () => {
    if (unpaidEmployees.length === 0) {
      toast("All employees already have payroll for this month", { icon: "ℹ️" });
      return;
    }

    setGenerating(true);
    try {
      // Fetch attendance data for this month
      const [year, month] = selectedMonth.split("-");
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("date", ">=", `${selectedMonth}-01`), where("date", "<=", `${selectedMonth}-${daysInMonth}`))
      );

      // Build attendance summary per employee for the month
      const attSummary: Record<string, { leave: number; late: number; absent: number }> = {};
      attSnap.docs.forEach((d) => {
        const r = d.data();
        if (!attSummary[r.employeeId]) attSummary[r.employeeId] = { leave: 0, late: 0, absent: 0 };
        if (r.status === "leave") attSummary[r.employeeId].leave++;
        if (r.status === "late") attSummary[r.employeeId].late++;
        if (r.status === "absent") attSummary[r.employeeId].absent++;
      });

      // Fetch active loans/advances
      const loansSnap = await getDocs(
        query(collection(db, "loans"), where("status", "==", "active"))
      );
      const loanMap: Record<string, number> = {};
      loansSnap.docs.forEach((d) => {
        const l = d.data();
        if (!loanMap[l.employeeId]) loanMap[l.employeeId] = 0;
        loanMap[l.employeeId] += l.monthlyDeduction || 0;
      });

      let count = 0;
      for (const emp of unpaidEmployees) {
        const att = attSummary[emp.employeeId] || { leave: 0, late: 0, absent: 0 };
        const perDaySalary = emp.salary / daysInMonth;

        // Deductions: absent days + 50% of late days
        const absDeduction = Math.round(att.absent * perDaySalary);
        const lateDeduction = Math.round(att.late * perDaySalary * 0.5);
        const totalDeductions = absDeduction + lateDeduction;

        const loanDeduction = loanMap[emp.employeeId] || 0;
        const finalSalary = Math.max(0, emp.salary - totalDeductions - loanDeduction);

        const payrollData: Omit<PayrollRecord, "id"> = {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          department: emp.department,
          month: selectedMonth,
          baseSalary: emp.salary,
          leaveDays: att.leave,
          lateDays: att.late,
          deductions: totalDeductions,
          bonus: 0,
          advanceDeduction: 0,
          loanDeduction,
          finalSalary,
          createdAt: Date.now(),
          createdBy: dbUser?.uid || "",
        };

        await addDoc(collection(db, "payroll"), payrollData);
        count++;
      }

      await logActivity("GENERATE", "payroll", `Generated payroll for ${count} employees for ${selectedMonth}`, dbUser?.uid || "", dbUser?.name);
      toast.success(`Payroll generated for ${count} employee(s)!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  const deletePayroll = async (record: PayrollRecord) => {
    if (!record.id) return;
    if (!confirm(`Delete payroll for ${record.employeeName}?`)) return;
    setDeletingId(record.id);
    try {
      await deleteDoc(doc(db, "payroll", record.id));
      await logActivity("DELETE", "payroll", `Deleted payroll for ${record.employeeName} (${record.month})`, dbUser?.uid || "", dbUser?.name);
      toast.success("Payroll record deleted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPayroll = records.reduce((s, r) => s + r.finalSalary, 0);
  const totalDeductions = records.reduce((s, r) => s + r.deductions, 0);
  const totalBonus = records.reduce((s, r) => s + r.bonus, 0);

  const isLoading = empLoading || payLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-green-50 dark:bg-green-900/10">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>HR Manager</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-green-600 dark:text-green-400">Salaries & Payroll</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300"
          />
        </div>

        <button
          onClick={generatePayroll}
          disabled={generating || unpaidEmployees.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Generate Payroll
          {unpaidEmployees.length > 0 && ` (${unpaidEmployees.length} pending)`}
        </button>
      </div>

      {/* Summary Cards */}
      {records.length > 0 && (
        <div className="px-6 py-3 grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100 dark:border-green-800/30">
            <div className="text-xs text-slate-500 mb-1">Total Payroll</div>
            <div className="font-bold text-green-600 dark:text-green-400 text-sm">{formatCurrency(totalPayroll)}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-100 dark:border-red-800/30">
            <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> Deductions</div>
            <div className="font-bold text-red-600 dark:text-red-400 text-sm">{formatCurrency(totalDeductions)}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-800/30">
            <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1"><Gift className="w-3 h-3" /> Bonuses</div>
            <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">{formatCurrency(totalBonus)}</div>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl">
            <DollarSign className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No payroll generated for {selectedMonth}</p>
            <p className="text-xs mt-1">Click "Generate Payroll" to create records for all active employees</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800/30 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Base Salary</th>
                    <th className="px-4 py-3">Leave Days</th>
                    <th className="px-4 py-3">Late Days</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Bonus</th>
                    <th className="px-4 py-3">Loan Deduct</th>
                    <th className="px-4 py-3 font-extrabold text-green-600">Final Salary</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 dark:border-zinc-800 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{record.employeeName}</div>
                        <div className="text-xs text-slate-400">{record.employeeId} · {record.department}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(record.baseSalary)}</td>
                      <td className="px-4 py-3">
                        <span className={record.leaveDays > 0 ? "text-blue-600 font-medium" : "text-slate-400"}>{record.leaveDays}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={record.lateDays > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>{record.lateDays}</span>
                      </td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">-{formatCurrency(record.deductions)}</td>
                      <td className="px-4 py-3 text-purple-600 dark:text-purple-400 font-medium">+{formatCurrency(record.bonus)}</td>
                      <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-medium">-{formatCurrency(record.loanDeduction)}</td>
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-green-600 dark:text-green-400 text-base">{formatCurrency(record.finalSalary)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setSelectedPayslip(record)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Payslip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePayroll(record)}
                            disabled={deletingId === record.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === record.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" id="payslip-content">
            <div className="bg-emerald-600 p-6 text-white">
              <h2 className="text-xl font-bold">PAYSLIP</h2>
              <p className="text-emerald-100 text-sm">Period: {selectedPayslip.month}</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <div className="font-bold text-slate-800 text-lg">{selectedPayslip.employeeName}</div>
                <div className="text-sm text-slate-500">{selectedPayslip.employeeId} · {selectedPayslip.department}</div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Base Salary", formatCurrency(selectedPayslip.baseSalary), "text-slate-700"],
                  ["Bonus", `+${formatCurrency(selectedPayslip.bonus)}`, "text-purple-600"],
                  ["Leave Deduction", `−${formatCurrency(Math.round(selectedPayslip.baseSalary / 30 * selectedPayslip.leaveDays))}`, "text-red-500"],
                  ["Late Deduction", `−${formatCurrency(selectedPayslip.deductions - Math.round(selectedPayslip.baseSalary / 30 * selectedPayslip.leaveDays))}`, "text-amber-500"],
                  ["Loan/Advance Deduction", `−${formatCurrency(selectedPayslip.loanDeduction)}`, "text-orange-500"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-semibold ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-slate-200 text-lg font-extrabold">
                  <span className="text-slate-800">NET SALARY</span>
                  <span className="text-green-600">{formatCurrency(selectedPayslip.finalSalary)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedPayslip(null)}
                className="flex-1 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition text-sm"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
