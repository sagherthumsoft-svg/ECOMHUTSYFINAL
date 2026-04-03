"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHREmployees } from "@/hooks/useHREmployees";
import { Employee, AttendanceRecord, PayrollRecord, Notice, Announcement } from "@/types";
import { exportToCSV } from "@/lib/hrUtils";
import {
  ChevronRight,
  FolderOpen,
  Search,
  Download,
  Loader2,
  Users,
  CalendarCheck,
  DollarSign,
  FileText,
  Megaphone,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type RecordTab = "employees" | "attendance" | "payroll" | "notices" | "announcements";

const TABS: { id: RecordTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "employees",     label: "Employees",     icon: Users,        color: "text-blue-600" },
  { id: "attendance",    label: "Attendance",    icon: CalendarCheck, color: "text-red-600" },
  { id: "payroll",       label: "Payroll",       icon: DollarSign,   color: "text-green-600" },
  { id: "notices",       label: "Notices",       icon: FileText,     color: "text-cyan-600" },
  { id: "announcements", label: "Announcements", icon: Megaphone,    color: "text-pink-600" },
];

export default function HRRecords() {
  const [activeTab, setActiveTab] = useState<RecordTab>("employees");
  const [search, setSearch] = useState("");

  const { employees, loading: empLoading } = useHREmployees();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // Load records for current tab
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    let unsubscribe: () => void = () => {};

    try {
      if (activeTab === "attendance") {
        unsubscribe = onSnapshot(
          query(collection(db, "attendance"), orderBy("date", "desc")),
          (snap) => {
            if (!isMounted) return;
            setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[]);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error("HRRecords Attendance Error:", err);
            setLoading(false);
          }
        );
      } else if (activeTab === "payroll") {
        unsubscribe = onSnapshot(
          query(collection(db, "payroll"), orderBy("createdAt", "desc")),
          (snap) => {
            if (!isMounted) return;
            setPayroll(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PayrollRecord[]);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error("HRRecords Payroll Error:", err);
            setLoading(false);
          }
        );
      } else if (activeTab === "notices") {
        unsubscribe = onSnapshot(
          query(collection(db, "notices"), orderBy("createdAt", "desc")),
          (snap) => {
            if (!isMounted) return;
            setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[]);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error("HRRecords Notices Error:", err);
            setLoading(false);
          }
        );
      } else if (activeTab === "announcements") {
        unsubscribe = onSnapshot(
          query(collection(db, "announcements"), orderBy("createdAt", "desc")),
          (snap) => {
            if (!isMounted) return;
            setAnnouncements(snap.docs.map((d) => ({
              announcementId: d.id,
              title: d.data().title,
              content: d.data().content,
              createdAt: typeof d.data().createdAt === "number" ? d.data().createdAt : d.data().createdAt?.toMillis?.() || 0,
              createdBy: d.data().createdBy,
              createdByName: d.data().createdByName,
            })) as Announcement[]);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error("HRRecords Announcements Error:", err);
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      console.error("HRRecords Initialization Error:", err);
      setLoading(false);
    }
  }, [activeTab]);

  const isLoading = activeTab === "employees" ? empLoading : loading;

  // Filter + export helpers
  const getFilteredData = () => {
    const q = search.toLowerCase();
    if (activeTab === "employees") {
      return employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q)
      );
    }
    if (activeTab === "attendance") {
      return attendance.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.date.includes(q) ||
          a.status.includes(q)
      );
    }
    if (activeTab === "payroll") {
      return payroll.filter(
        (p) =>
          p.employeeName.toLowerCase().includes(q) ||
          p.month.includes(q)
      );
    }
    if (activeTab === "notices") {
      return notices.filter(
        (n) => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
      );
    }
    if (activeTab === "announcements") {
      return announcements.filter(
        (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      );
    }
    return [];
  };

  const handleExportCSV = () => {
    const data = getFilteredData();
    if (!data.length) return;
    // Clean data for CSV (remove nested objects)
    const cleaned = data.map((row: any) => {
      const out: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const val = row[k];
        if (typeof val !== "object" || val === null) out[k] = val;
      });
      return out;
    });
    exportToCSV(cleaned, `HR_${activeTab}_${new Date().toISOString().split("T")[0]}`);
  };

  const filteredData = getFilteredData();

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      );
    }
    if (filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">No records found</p>
        </div>
      );
    }

    if (activeTab === "employees") {
      const rows = filteredData as Employee[];
      return (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Join Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.employeeId}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{e.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.department}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.role}</td>
                <td className="px-4 py-3 font-semibold">PKR {e.salary.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    e.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    e.status === "probation" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>{e.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{e.joiningDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "attendance") {
      const rows = filteredData as AttendanceRecord[];
      return (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-In</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.employeeName}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.employeeId}</td>
                <td className="px-4 py-3 text-slate-600">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === "present" ? "bg-emerald-100 text-emerald-700" :
                    r.status === "absent" ? "bg-red-100 text-red-700" :
                    r.status === "late" ? "bg-amber-100 text-amber-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.checkInTime || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "payroll") {
      const rows = filteredData as PayrollRecord[];
      return (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Base Salary</th>
              <th className="px-4 py-3">Deductions</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3 text-green-600">Final Salary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.employeeName}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.month}</td>
                <td className="px-4 py-3">PKR {r.baseSalary.toLocaleString()}</td>
                <td className="px-4 py-3 text-red-500">-PKR {r.deductions.toLocaleString()}</td>
                <td className="px-4 py-3 text-purple-500">+PKR {r.bonus.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-green-600">PKR {r.finalSalary.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "notices") {
      const rows = filteredData as Notice[];
      return (
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {rows.map((n) => (
            <div key={n.id} className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{n.title}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{n.description}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {formatDistanceToNow(n.createdAt, { addSuffix: true })} · By {n.createdByName || "HR"}
                {n.fileUrl && <span className="ml-2 text-cyan-500">📎 Has attachment</span>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "announcements") {
      const rows = filteredData as Announcement[];
      return (
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {rows.map((a) => (
            <div key={a.announcementId} className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {formatDistanceToNow(a.createdAt, { addSuffix: true })} · By {a.createdByName || "Team"}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-slate-50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>HR Manager</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Record Management</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Unified view of all HR records with search and CSV export</p>
      </div>

      {/* Tab Switcher */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Export */}
      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredData.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Count */}
      <div className="px-6 py-2 shrink-0">
        <p className="text-xs text-slate-400">
          {isLoading ? "Loading…" : `${filteredData.length} record${filteredData.length !== 1 ? "s" : ""}`}
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* Table/List */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
