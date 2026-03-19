"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot, doc, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import { Task, TaskStatus, TaskPriority } from "@/types";
import { formatDistanceToNow, format, isPast } from "date-fns";
import {
  ListTodo, CheckCircle2, Circle, Clock, AlertCircle,
  Loader2, Plus, Flag, User as UserIcon, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

const ADMIN_ROLES = ["owner", "manager", "head"] as const;

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", color: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400", dot: "bg-slate-400" },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; next: TaskStatus }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", next: "in-progress" },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", next: "completed" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", next: "pending" },
};

export default function TasksPage() {
  const { dbUser } = useUserStore();
  const { searchQuery, setActiveModal } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskStatus | "all">("all");
  const isAdmin = dbUser?.role && ADMIN_ROLES.includes(dbUser.role as any);

  useEffect(() => {
    if (!dbUser?.uid) return;

    setIsLoading(true);
    setError(null);

    const uid = dbUser.uid;

    // Merge two real-time query results in memory.
    // Rule: allow read if assignedTo == uid OR assignedBy == uid OR isAdmin.
    // We run: (1) tasks assigned TO this user, (2) tasks assigned BY this user.
    let assignedToTasks: Task[] = [];
    let assignedByTasks: Task[] = [];

    const merge = () => {
      // Deduplicate by taskId
      const map = new Map<string, Task>();
      [...assignedToTasks, ...assignedByTasks].forEach((t) => map.set(t.taskId, t));
      const all = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      setTasks(all);
      setIsLoading(false);
    };

    const mapDoc = (d: any): Task => {
      const data = d.data();
      const createdAt =
        typeof data.createdAt === "number"
          ? data.createdAt
          : data.createdAt?.toMillis?.() || Date.now();
      const deadline =
        data.deadline
          ? typeof data.deadline === "number"
            ? data.deadline
            : data.deadline?.toMillis?.() || undefined
          : undefined;

      return {
        taskId: d.id,
        taskTitle: data.taskTitle || data.title || "Untitled Task",
        description: data.description || "",
        assignedTo: data.assignedTo || "",
        assignedBy: data.assignedBy || "",
        status: (data.status as TaskStatus) || "pending",
        priority: (data.priority as TaskPriority) || "medium",
        deadline,
        createdAt,
      };
    };

    // Query 1: tasks assigned TO me
    const qTo = isAdmin
      ? query(collection(db, "tasks"))  // Admins see everything
      : query(collection(db, "tasks"), where("assignedTo", "==", uid));

    // Query 2: tasks assigned BY me (only needed for team members to see tasks they created if any)
    const qBy = isAdmin 
      ? null 
      : query(collection(db, "tasks"), where("assignedBy", "==", uid));

    const unsubTo = onSnapshot(
      qTo,
      (snap) => {
        assignedToTasks = snap.docs.map(mapDoc);
        merge();
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    let unsubBy = () => {};
    if (qBy) {
      unsubBy = onSnapshot(
        qBy,
        (snap) => {
          assignedByTasks = snap.docs.map(mapDoc);
          merge();
        },
        (err) => {
          console.warn("assignedBy query error:", err.message);
          setIsLoading(false);
        }
      );
    }

    return () => {
      unsubTo();
      unsubBy();
    };
  }, [dbUser?.uid]);

  const cycleStatus = async (task: Task) => {
    const canChange =
      task.assignedTo === dbUser?.uid || isAdmin;
    if (!canChange) return toast.error("You cannot change the status of tasks not assigned to you.");

    const nextStatus = STATUS_CONFIG[task.status]?.next || "pending";
    try {
      await updateDoc(doc(db, "tasks", task.taskId), { status: nextStatus });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      (t.taskTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || t.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-800/80 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-emerald-600" />
            My Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {counts.completed} of {counts.all} task{counts.all !== 1 ? "s" : ""} completed
          </p>
        </div>

        {/* Progress bar + Create button */}
        <div className="flex items-center gap-4">
          {counts.all > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-1 min-w-[100px]">
              <span className="text-xs text-slate-500">{Math.round((counts.completed / counts.all) * 100)}%</span>
              <div className="w-24 h-2 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(counts.completed / counts.all) * 100}%` }}
                />
              </div>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveModal("createTask")}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "in-progress", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              activeFilter === f
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700 hover:border-emerald-400"
            }`}
          >
            {f === "all" ? "All" : STATUS_CONFIG[f as TaskStatus].label}{" "}
            <span className="ml-1 opacity-70 text-xs">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading tasks…</span>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-500 font-medium">Failed to load tasks</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 opacity-25" />
          <p className="text-sm font-medium">
            {searchQuery || activeFilter !== "all"
              ? "No tasks match your filter."
              : "No tasks assigned yet."}
          </p>
          {isAdmin && !searchQuery && activeFilter === "all" && (
            <button
              onClick={() => setActiveModal("createTask")}
              className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Task
            </button>
          )}
        </div>
      )}

      {/* Task grid */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const priority = task.priority || "medium";
            const priorityCfg = PRIORITY_CONFIG[priority];
            const isOverdue = task.deadline && task.status !== "completed" && isPast(task.deadline);
            const isMine = task.assignedTo === dbUser?.uid;

            return (
              <div
                key={task.taskId}
                className={`bg-white dark:bg-[#111b21] p-5 rounded-2xl border shadow-sm flex flex-col gap-4 transition-all hover:shadow-md ${
                  task.status === "completed"
                    ? "border-emerald-200 dark:border-emerald-900/50 opacity-75"
                    : isOverdue
                    ? "border-red-200 dark:border-red-900/50"
                    : "border-slate-200 dark:border-zinc-800"
                }`}
              >
                {/* Top row: status toggle + title */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => cycleStatus(task)}
                    className={`shrink-0 mt-0.5 transition-transform hover:scale-110 ${
                      task.status === "completed"
                        ? "text-emerald-500"
                        : task.status === "in-progress"
                        ? "text-blue-500"
                        : "text-slate-400"
                    }`}
                    title={`Click to mark as ${statusCfg.next}`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-base text-slate-800 dark:text-slate-100 leading-snug ${
                        task.status === "completed" ? "line-through text-slate-400 dark:text-slate-500" : ""
                      }`}
                    >
                      {task.taskTitle}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status tag — clickable to cycle */}
                  <button
                    onClick={() => cycleStatus(task)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusCfg.color} flex items-center gap-1`}
                  >
                    {statusCfg.label}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {/* Priority */}
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${priorityCfg.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                    {priorityCfg.label}
                  </span>

                  {/* Overdue warning */}
                  {isOverdue && (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>

                {/* Footer: meta info */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-3 text-xs text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1.5">
                    {task.deadline ? (
                      <>
                        <Clock className={`w-3.5 h-3.5 ${isOverdue ? "text-red-400" : ""}`} />
                        <span className={isOverdue ? "text-red-400 font-semibold" : ""}>
                          Due {format(task.deadline, "MMM d")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDistanceToNow(task.createdAt, { addSuffix: true })}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{isMine ? "You" : task.assignedTo.slice(0, 8) + "…"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
