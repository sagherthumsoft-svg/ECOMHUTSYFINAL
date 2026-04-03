"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHREmployees } from "@/hooks/useHREmployees";
import { getTodayString, getCurrentMonthString, formatCurrency } from "@/lib/hrUtils";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  DollarSign,
  TrendingUp,
  CalendarCheck,
} from "lucide-react";

interface HRDashboardProps {
  onNavigate: (view: string) => void;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
}

interface SalaryOverview {
  totalPayroll: number;
  avgSalary: number;
}

export default function HRDashboard({ onNavigate }: HRDashboardProps) {
  const { employees, loading: empLoading } = useHREmployees();
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
  });
  const [salaryOverview, setSalaryOverview] = useState<SalaryOverview>({
    totalPayroll: 0,
    avgSalary: 0,
  });
  const [attLoading, setAttLoading] = useState(true);

  const today = getTodayString();
  const currentMonth = getCurrentMonthString();

  // Real-time today's attendance
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => { };

    try {
      const q = query(collection(db, "attendance"), where("date", "==", today));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          const counts = { present: 0, absent: 0, late: 0, leave: 0, total: snap.size };
          snap.docs.forEach((d) => {
            const s = d.data().status as string;
            if (s === "present") counts.present++;
            else if (s === "absent") counts.absent++;
            else if (s === "late") counts.late++;
            else if (s === "leave") counts.leave++;
          });
          setAttendanceSummary(counts);
          setAttLoading(false);
        },
        (err) => {
          if (!isMounted) return;
          console.error("HRDashboard Attendance Listener Error:", err);
          setAttLoading(false);
        }
      );
    } catch (err) {
      console.error("HRDashboard Attendance Effect Error:", err);
      if (isMounted) setAttLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [today]);

  // Real-time current month payroll
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => { };

    try {
      const q = query(
        collection(db, "payroll"),
        where("month", "==", currentMonth)
      );
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          let total = 0;
          snap.docs.forEach((d) => {
            total += d.data().finalSalary || 0;
          });
          const avg = snap.size > 0 ? Math.round(total / snap.size) : 0;
          setSalaryOverview({ totalPayroll: total, avgSalary: avg });
        },
        (err) => {
          if (!isMounted) return;
          console.error("HRDashboard Payroll Listener Error:", err);
        }
      );
    } catch (err) {
      console.error("HRDashboard Payroll Effect Error:", err);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentMonth]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const inactiveEmployees = employees.filter((e) => e.status === "inactive").length;
  const probationEmployees = employees.filter((e) => e.status === "probation").length;

  const statCards = [
    {
      label: "Total Employees",
      value: totalEmployees,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-100 dark:border-blue-800/30",
      onClick: () => onNavigate("staff"),
    },
    {
      label: "Active",
      value: activeEmployees,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800/30",
      onClick: () => onNavigate("staff"),
    },
    {
      label: "Inactive / Left",
      value: inactiveEmployees,
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-100 dark:border-red-800/30",
      onClick: () => onNavigate("staff"),
    },
    {
      label: "On Probation",
      value: probationEmployees,
      icon: UserPlus,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800/30",
      onClick: () => onNavigate("staff"),
    },
  ];

  const quickActions = [
    { label: "New Hiring", view: "hiring", color: "bg-emerald-600 hover:bg-emerald-700", icon: UserPlus },
    { label: "Mark Attendance", view: "attendance", color: "bg-blue-600 hover:bg-blue-700", icon: CalendarCheck },
    { label: "Payroll", view: "salaries", color: "bg-purple-600 hover:bg-purple-700", icon: DollarSign },
    { label: "Leave Requests", view: "leaves", color: "bg-orange-600 hover:bg-orange-700", icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -right-12 w-40 h-40 bg-white/5 rounded-full" />
        <h2 className="text-2xl font-bold mb-1 relative z-10">HR Management</h2>
        <p className="text-emerald-100 text-sm relative z-10">
          {new Date().toLocaleDateString("en-PK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="mt-4 flex gap-3 flex-wrap relative z-10">
          {quickActions.map((qa) => (
            <button
              key={qa.view}
              onClick={() => onNavigate(qa.view)}
              className={`flex items-center gap-2 px-4 py-2 ${qa.color} bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-all duration-200`}
            >
              <qa.icon className="w-4 h-4" />
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={`flex flex-col items-start p-4 bg-white dark:bg-zinc-800/50 border ${card.border} rounded-2xl hover:shadow-md transition-all duration-200 text-left group`}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {empLoading ? "—" : card.value}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Row: Attendance + Salary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Attendance */}
        <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-500" /> Today's Attendance
            </h3>
            <button
              onClick={() => onNavigate("attendance")}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Mark Now →
            </button>
          </div>
          {attLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : attendanceSummary.total === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No attendance marked yet today
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Present", count: attendanceSummary.present, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                { label: "Absent", count: attendanceSummary.absent, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
                { label: "Late", count: attendanceSummary.late, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
                { label: "Leave", count: attendanceSummary.leave, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salary Overview */}
        <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Salary Overview
            </h3>
            <button
              onClick={() => onNavigate("salaries")}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Manage →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Payroll ({currentMonth})</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(salaryOverview.totalPayroll)}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Salary</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(salaryOverview.avgSalary)}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 text-center">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Based on generated payroll for {currentMonth}
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">All Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { view: "hiring", label: "New Hiring", icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { view: "staff", label: "Staff Mgmt", icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { view: "attendance", label: "Attendance", icon: CalendarCheck, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
            { view: "salaries", label: "Payroll", icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
            { view: "leaves", label: "Leaves", icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { view: "loans", label: "Advances & Loans", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { view: "notices", label: "Notices", icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
            { view: "announcements", label: "Announcements", icon: Users, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20" },
            { view: "records", label: "Records", icon: UserCheck, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/50" },
          ].map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 group text-center"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
