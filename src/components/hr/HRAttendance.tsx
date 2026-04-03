"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHREmployees } from "@/hooks/useHREmployees";
import { useHRAttendance } from "@/hooks/useHRAttendance";
import { AttendanceStatus } from "@/types";
import {
  getLateThreshold,
  setLateThreshold,
  getTodayString,
  logActivity,
} from "@/lib/hrUtils";
import {
  ChevronRight,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Loader2,
  Save,
  Download,
  RefreshCw,
  MapPin
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string; border: string }[] = [
  {
    value: "present",
    label: "Present",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-400",
  },
  {
    value: "absent",
    label: "Absent",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400",
  },
  {
    value: "late",
    label: "Late",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-400",
  },
  {
    value: "leave",
    label: "Leave",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400",
  },
];

export default function HRAttendance() {
  const { dbUser } = useUserStore();
  const { employees, loading: empLoading } = useHREmployees();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [lateThreshold, setLateThresholdState] = useState("09:30");
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [markingAll, setMarkingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [filterOffice, setFilterOffice] = useState("All");

  const { records, loading: attLoading } = useHRAttendance(selectedDate);

  useEffect(() => {
    getLateThreshold().then(setLateThresholdState);
  }, []);

  const attendanceMap = new Map(records.map((r) => [r.employeeId, r]));

  const departments = [
    "All",
    "Zain Team",
    "Asim Team",
    "Sajid Team",
    "Awais Yousaf Team",
    "Kashif Team",
    "Waseel Team",
  ];
  const offices = [
    "All",
    "Ittehad Office",
    "Shalimar Office",
    "Head Office",
    "Cantt Office"
  ];

  const filteredEmployees = employees.filter(
    (e) => (filterDept === "All" || e.department === filterDept)
  );

  const filterRecords = records.filter(
      (r) => (filterOffice === "All" || r.office === filterOffice)
  );

  const markAttendance = async (
    employeeId: string,
    employeeName: string,
    status: AttendanceStatus,
    checkInTime?: string,
    checkOutTime?: string
  ) => {
    const key = employeeId;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const existing = attendanceMap.get(employeeId);
      const data = {
        employeeId,
        employeeName,
        date: selectedDate,
        status,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        office: filterOffice !== "All" ? filterOffice : "Head Office",
        createdAt: Date.now(),
        createdBy: dbUser?.uid || "",
      };

      if (existing?.id) {
        await deleteDoc(doc(db, "attendance", existing.id));
        await addDoc(collection(db, "attendance"), data);
      } else {
        await addDoc(collection(db, "attendance"), data);
      }

      await logActivity(
        "MARK",
        "attendance",
        `Marked ${employeeName} as ${status} on ${selectedDate}`,
        dbUser?.uid || "",
        dbUser?.name
      );
    } catch (err: any) {
      toast.error(`Failed to mark attendance: ${err.message}`);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const markAllPresent = async () => {
    setMarkingAll(true);
    try {
      for (const emp of filteredEmployees) {
        if (!attendanceMap.has(emp.employeeId)) {
          await markAttendance(emp.employeeId, emp.name, "present");
        }
      }
      toast.success("All unmarked employees marked as Present");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const saveLateThreshold = async () => {
    try {
      await setLateThreshold(lateThreshold);
      toast.success(`Late threshold updated to ${lateThreshold}`);
      setShowSettings(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const syncHikvisionData = async () => {
    setSyncing(true);
    toast.loading("Syncing with Hikvision...", { id: "sync" });
    try {
      const startTime = `${selectedDate}T00:00:00+08:00`;
      const endTime = `${selectedDate}T23:59:59+08:00`;

      const response = await fetch("/api/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime,
          endTime,
          officeId: filterOffice !== "All" ? filterOffice : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed");

      toast.success(`Synced successfully. Added: ${data.stats.added}, Updated: ${data.stats.updated}`, { id: "sync" });
    } catch (error: any) {
      toast.error(error.message, { id: "sync" });
    } finally {
      setSyncing(false);
    }
  };

  const downloadReport = () => {
      // Export logic to CSV
      const rows = [
          ["Employee ID", "Name", "Date", "Office", "Status", "Check-in", "Check-out"]
      ];
      
      const recordsToExport = filterOffice === "All" ? records : filterRecords;
      
      recordsToExport.forEach(r => {
          rows.push([
              r.employeeId,
              r.employeeName,
              r.date,
              r.office || "Head Office",
              r.status,
              r.checkInTime || "-",
              r.checkOutTime || "-"
          ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const summary = {
    present: filterRecords.filter((r) => r.status === "present").length,
    absent: filterRecords.filter((r) => r.status === "absent").length,
    late: filterRecords.filter((r) => r.status === "late").length,
    leave: filterRecords.filter((r) => r.status === "leave").length,
  };

  const isLoading = empLoading || attLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>HR Manager</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-red-600 dark:text-red-400">Attendance Dashboard</span>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2">
             <MapPin className="w-4 h-4 text-slate-400" />
             <select
                 value={filterOffice}
                 onChange={(e) => setFilterOffice(e.target.value)}
                 className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300"
             >
                 {offices.map((o) => (
                    <option key={o} value={o}>{o}</option>
                 ))}
             </select>
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            onClick={syncHikvisionData}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Hikvision Data
          </button>

          <button
            onClick={markAllPresent}
            disabled={markingAll}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Mark All Present
          </button>

          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition ml-auto"
          >
             <Download className="w-4 h-4" />
             Download Report
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Late Threshold: {lateThreshold}
          </button>
        </div>

        {showSettings && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Check-in after:</span>
            <input
              type="time"
              value={lateThreshold}
              onChange={(e) => setLateThresholdState(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-700 rounded-lg text-sm outline-none"
            />
            <span className="text-sm text-amber-600">= Late</span>
            <button
              onClick={saveLateThreshold}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition ml-auto"
            >
              <Save className="w-3 h-3" /> Save
            </button>
          </div>
        )}

        {filterRecords.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              { label: "Present", count: summary.present, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
              { label: "Absent", count: summary.absent, color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
              { label: "Late", count: summary.late, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
              { label: "Leave", count: summary.leave, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
            ].map((s) => (
              <span key={s.label} className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>
                {s.label}: {s.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((emp) => {
              const record = attendanceMap.get(emp.employeeId);
              if (filterOffice !== "All" && record && record.office !== filterOffice) {
                  return null;
              }

              const isSaving = saving[emp.employeeId];

              return (
                <div
                  key={emp.employeeId}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-zinc-800/40 border rounded-2xl transition-all ${
                    record
                      ? record.status === "absent"
                        ? "border-red-200 dark:border-red-800/40 bg-red-50/30 dark:bg-red-900/5"
                        : record.status === "late"
                        ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/5"
                        : "border-emerald-200 dark:border-emerald-800/40"
                      : "border-slate-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{emp.name}</div>
                      <div className="text-xs text-slate-400">
                          {emp.employeeId} · {emp.department} · {record?.office || "Unassigned"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">In:</span>
                        <input
                          type="time"
                          defaultValue={record?.checkInTime || ""}
                          id={`checkin-${emp.employeeId}`}
                          onChange={(e) => {
                              if (record?.status) {
                                  markAttendance(emp.employeeId, emp.name, record.status, e.target.value, record.checkOutTime);
                              }
                          }}
                          className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Out:</span>
                        <input
                          type="time"
                          defaultValue={record?.checkOutTime || ""}
                          id={`checkout-${emp.employeeId}`}
                          onChange={(e) => {
                              if (record?.status) {
                                  markAttendance(emp.employeeId, emp.name, record.status, record.checkInTime, e.target.value);
                              }
                          }}
                          className="px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none w-28"
                        />
                      </div>
                  </div>

                  <div className="flex gap-1.5 ml-4">
                    {isSaving ? (
                      <div className="flex items-center px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      </div>
                    ) : (
                      STATUS_OPTIONS.map((opt) => {
                        const isSelected = record?.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              const inInput = document.getElementById(`checkin-${emp.employeeId}`) as HTMLInputElement;
                              const outInput = document.getElementById(`checkout-${emp.employeeId}`) as HTMLInputElement;
                              markAttendance(emp.employeeId, emp.name, opt.value, inInput?.value || undefined, outInput?.value || undefined);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                              isSelected
                                ? `${opt.bg} ${opt.border} ${opt.color}`
                                : "border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
