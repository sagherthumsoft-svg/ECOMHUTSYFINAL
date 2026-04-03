"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { Announcement } from "@/types";
import { logActivity } from "@/lib/hrUtils";
import {
  ChevronRight,
  Megaphone,
  Plus,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

export default function HRAnnouncements() {
  const { dbUser } = useUserStore();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", content: "" });

  // Real-time subscription to the shared announcements collection
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => {};

    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          setAnnouncements(
            snap.docs.map((d) => ({
              announcementId: d.id,
              title: d.data().title || "Untitled",
              content: d.data().content || "",
              createdAt:
                typeof d.data().createdAt === "number"
                  ? d.data().createdAt
                  : d.data().createdAt?.toMillis?.() || Date.now(),
              createdBy: d.data().createdBy || "",
              createdByName: d.data().createdByName || "HR",
            })) as Announcement[]
          );
          setLoading(false);
        },
        (err) => {
          if (!isMounted) return;
          console.error("HRAnnouncements Listener Error:", err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("HRAnnouncements Effect Error:", err);
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.content.trim()) return toast.error("Content is required");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: form.title.trim(),
        content: form.content.trim(),
        createdAt: Date.now(),
        createdBy: dbUser?.uid || "",
        createdByName: dbUser?.name || "HR",
      });

      await logActivity(
        "CREATE",
        "announcements",
        `Created announcement: ${form.title}`,
        dbUser?.uid || "",
        dbUser?.name
      );

      toast.success("Announcement posted to all users!");
      setForm({ title: "", content: "" });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm(`Delete announcement "${announcement.title}"?`)) return;
    setDeletingId(announcement.announcementId);
    try {
      await deleteDoc(doc(db, "announcements", announcement.announcementId));
      await logActivity(
        "DELETE",
        "announcements",
        `Deleted announcement: ${announcement.title}`,
        dbUser?.uid || "",
        dbUser?.name
      );
      toast.success("Announcement deleted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-pink-50 dark:bg-pink-900/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>HR Manager</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-pink-600 dark:text-pink-400">Announcements</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Posts appear on the main Announcements tab for all users
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Post Announcement"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-pink-50/50 dark:bg-pink-900/5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Title *</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-slate-100 text-sm font-semibold transition"
                placeholder="Announcement title…"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Content *</label>
              <textarea
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition resize-none"
                rows={4}
                placeholder="What would you like to announce to the team?"
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                Post Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Megaphone className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No announcements yet</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.announcementId}
              className="bg-white dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-2xl p-5 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{ann.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-full">
                    {formatDistanceToNow(ann.createdAt, { addSuffix: true })}
                  </span>
                  <button
                    onClick={() => handleDelete(ann)}
                    disabled={deletingId === ann.announcementId}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {deletingId === ann.announcementId
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ann.content}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {(ann.createdByName || "H")[0].toUpperCase()}
                </div>
                <span className="text-xs text-slate-400">
                  Posted by <span className="font-semibold text-slate-600 dark:text-slate-400">{ann.createdByName || "HR"}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
