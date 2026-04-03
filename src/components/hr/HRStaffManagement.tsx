"use client";

import { useState } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHREmployees } from "@/hooks/useHREmployees";
import { Employee, EmployeeStatus } from "@/types";
import { logActivity } from "@/lib/hrUtils";
import {
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Save,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

const DEPARTMENTS = [
  "All", 
  "Zain Team", 
  "Asim Team", 
  "Sajid Team", 
  "Awais Yousaf Team", 
  "Kashif Team", 
  "Waseel Team",
];

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  probation: { label: "Probation", color: "text-amber-700",   bg: "bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
  inactive:  { label: "Inactive",  color: "text-red-700",     bg: "bg-red-100 dark:bg-red-900/30 dark:text-red-400" },
};

export default function HRStaffManagement() {
  const { dbUser } = useUserStore();
  const { employees, loading } = useHREmployees();

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Filtered employees
  const filtered = employees.filter((emp) => {
    const matchSearch =
      !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.includes(search) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "All" || emp.department === filterDept;
    const matchStatus = filterStatus === "All" || emp.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const handleDelete = async (emp: Employee) => {
    if (!emp.id) return;
    if (!confirm(`Delete employee "${emp.name}" (${emp.employeeId})? This is permanent.`)) return;

    setDeletingId(emp.id);
    try {
      await deleteDoc(doc(db, "employees", emp.id));
      await logActivity("DELETE", "employees", `Deleted employee ${emp.name} (${emp.employeeId})`, dbUser?.uid || "", dbUser?.name);
      toast.success(`Employee ${emp.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusToggle = async (emp: Employee) => {
    if (!emp.id) return;
    const newStatus: EmployeeStatus = emp.status === "active" ? "inactive" : "active";
    try {
      await updateDoc(doc(db, "employees", emp.id), { status: newStatus });
      await logActivity("UPDATE", "employees", `Changed ${emp.name} status to ${newStatus}`, dbUser?.uid || "", dbUser?.name);
      toast.success(`${emp.name} marked as ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleEditSave = async () => {
    if (!editEmployee?.id) return;

    if (!editEmployee.name.trim()) return toast.error("Name is required");
    if (!editEmployee.phone.trim()) return toast.error("Phone is required");
    if (!editEmployee.department) return toast.error("Department is required");
    if (!editEmployee.salary || editEmployee.salary <= 0) return toast.error("Valid salary required");

    setEditLoading(true);
    try {
      const { id, ...data } = editEmployee;
      await updateDoc(doc(db, "employees", editEmployee.id), {
        name: data.name.trim(),
        fatherName: data.fatherName,
        phone: data.phone.trim(),
        email: data.email,
        cnic: data.cnic,
        address: data.address,
        department: data.department,
        role: data.role,
        salary: Number(data.salary),
        joiningDate: data.joiningDate,
        status: data.status,
      });
      await logActivity("UPDATE", "employees", `Updated employee ${editEmployee.name}`, dbUser?.uid || "", dbUser?.name);
      toast.success("Employee updated successfully");
      setEditEmployee(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setEditLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-blue-50 dark:bg-blue-900/10">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>HR Manager</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-blue-600 dark:text-blue-400">Staff Management</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {employees.length} total employee{employees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none"
        >
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-3">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No employees found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800/30 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Dept / Role</th>
                    <th className="px-4 py-3">Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => {
                    const sc = STATUS_CONFIG[emp.status];
                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-slate-100 dark:border-zinc-800 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.name}</div>
                              <div className="text-xs text-slate-400">{emp.employeeId} · {emp.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{emp.department}</div>
                          <div className="text-xs text-slate-400">{emp.role}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          PKR {emp.salary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleStatusToggle(emp)}
                              title={emp.status === "active" ? "Set Inactive" : "Set Active"}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            >
                              {emp.status === "active"
                                ? <UserX className="w-4 h-4" />
                                : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditEmployee({ ...emp })}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              disabled={deletingId === emp.id}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingId === emp.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a2730] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-zinc-700 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit Employee</h3>
              <button
                onClick={() => setEditEmployee(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name", field: "name", type: "text" },
                  { label: "Father's Name", field: "fatherName", type: "text" },
                  { label: "Phone", field: "phone", type: "text" },
                  { label: "Email", field: "email", type: "email" },
                  { label: "CNIC", field: "cnic", type: "text" },
                  { label: "Address", field: "address", type: "text" },
                  { label: "Role", field: "role", type: "text" },
                  { label: "Salary (PKR)", field: "salary", type: "number" },
                  { label: "Joining Date", field: "joiningDate", type: "date" },
                ].map(({ label, field, type }) => (
                  <div key={field} className={field === "address" ? "col-span-2" : ""}>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
                    <input
                      type={type}
                      value={(editEmployee as any)[field] ?? ""}
                      onChange={(e) =>
                        setEditEmployee((prev) => prev ? { ...prev, [field]: type === "number" ? Number(e.target.value) : e.target.value } : null)
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Department</label>
                  <select
                    value={editEmployee.department}
                    onChange={(e) => setEditEmployee((prev) => prev ? { ...prev, department: e.target.value } : null)}
                    className={inputClass}
                  >
                    {DEPARTMENTS.filter(d => d !== "All").map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Status</label>
                  <select
                    value={editEmployee.status}
                    onChange={(e) => setEditEmployee((prev) => prev ? { ...prev, status: e.target.value as EmployeeStatus } : null)}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-zinc-700 shrink-0">
              <button
                onClick={() => setEditEmployee(null)}
                className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
