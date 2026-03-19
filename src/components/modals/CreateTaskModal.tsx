"use client";

import { useEffect, useState } from "react";
import { User, TaskPriority } from "@/types";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { X, Loader2, Flag, Calendar, Users } from "lucide-react";
import toast from "react-hot-toast";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-slate-500" },
  { value: "medium", label: "Medium", color: "text-amber-500" },
  { value: "high", label: "High", color: "text-red-500" },
];

export default function CreateTaskModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { dbUser } = useUserStore();
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !dbUser?.uid) return;
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      setUsers(
        snapshot.docs.map((d) => ({ ...d.data(), uid: d.id } as User))
      );
    });
    return () => unsubscribe();
  }, [isOpen, dbUser?.uid]);

  const handleClose = () => {
    setTaskTitle("");
    setDescription("");
    setAssignedUsers([]);
    setPriority("medium");
    setDeadline("");
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!taskTitle.trim()) return toast.error("Task title is required");
    if (assignedUsers.length === 0) return toast.error("Please select at least one assignee");

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in.");
      const idToken = await currentUser.getIdToken();

      const res = await fetch("/api/admin/create-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          taskTitle: taskTitle.trim(),
          description: description.trim(),
          assignedUsers,
          priority,
          deadline: deadline ? new Date(deadline).getTime() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      toast.success(`Task created & assigned to ${assignedUsers.length} user${assignedUsers.length !== 1 ? "s" : ""}!`);
      handleClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (uid: string) => {
    setAssignedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Today's date as min for deadline input
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111b21] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 dark:border-zinc-800">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Task</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign work to team members</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Task Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 transition"
              placeholder="e.g. Audit Q1 Inventory"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none transition"
              placeholder="Describe what needs to be done…"
            />
          </div>

          {/* Priority + Deadline row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Flag className="w-3 h-3" /> Priority
              </label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                      priority === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        : "border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Deadline
              </label>
              <input
                type="date"
                min={today}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Assign To{" "}
              <span className="text-red-500">*</span>
              {assignedUsers.length > 0 && (
                <span className="ml-auto text-emerald-600 dark:text-emerald-400 normal-case font-semibold text-[11px]">
                  {assignedUsers.length} selected
                </span>
              )}
            </label>
            <div className="border border-slate-200 dark:border-zinc-700 rounded-xl max-h-52 overflow-y-auto bg-slate-50 dark:bg-zinc-800/30">
              {users
                .filter((u) => u.uid !== dbUser?.uid)
                .map((u) => (
                  <label
                    key={u.uid}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-700/50 cursor-pointer border-b border-slate-100 dark:border-zinc-800 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={assignedUsers.includes(u.uid)}
                      onChange={() => toggleUser(u.uid)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(u.fullName || u.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {u.fullName || u.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{u.email} · {u.role?.replace("_", " ")}</div>
                    </div>
                  </label>
                ))}
              {users.filter((u) => u.uid !== dbUser?.uid).length === 0 && (
                <div className="py-6 text-center text-slate-400 text-sm">No other users found.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || assignedUsers.length === 0}
              className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Task{assignedUsers.length > 1 ? ` (${assignedUsers.length})` : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
