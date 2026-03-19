"use client";

import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import { Announcement } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, Plus, Loader2, X, AlertCircle, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";

const ADMIN_ROLES = ["owner", "manager", "head"] as const;

export default function AnnouncementsPage() {
  const { dbUser } = useUserStore();
  const { searchQuery } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = dbUser?.role && ADMIN_ROLES.includes(dbUser.role as any);

  useEffect(() => {
    if (!dbUser?.uid) return;

    setIsLoading(true);
    setError(null);

    // All authenticated users can read announcements per Firestore rules
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const createdAt =
            typeof d.createdAt === "number"
              ? d.createdAt
              : d.createdAt?.toMillis?.() || Date.now();
          return {
            announcementId: doc.id,
            title: d.title || "Untitled",
            content: d.content || "",
            createdAt,
            createdBy: d.createdBy || "system",
            createdByName: d.createdByName || "Team",
          } as Announcement;
        });
        setAnnouncements(data);
        setIsLoading(false);

        // Update last seen to clear the counter in AppBar
        localStorage.setItem("lastReadAnnouncements", Date.now().toString());
        // Trigger AppBar update
        window.dispatchEvent(new Event("chatRead"));
      },
      (err) => {
        console.error("Announcements error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dbUser?.uid]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!content.trim()) return toast.error("Content is required");
    if (!dbUser?.uid) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        content: content.trim(),
        createdAt: Date.now(),
        createdBy: dbUser.uid,
        createdByName: dbUser.fullName || dbUser.name || "Admin",
      });
      toast.success("Announcement posted!");
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-600" />
            Company Announcements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with the latest news from leadership
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium transition flex items-center gap-2 text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Post"}
          </button>
        )}
      </div>

      {/* Post form (admin only) */}
      {showForm && isAdmin && (
        <form
          onSubmit={handlePost}
          className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700 space-y-4"
        >
          <input
            type="text"
            placeholder="Announcement title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 text-lg font-semibold bg-transparent border-b-2 border-slate-200 dark:border-zinc-700 focus:border-emerald-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
          />
          <textarea
            rows={4}
            placeholder="What do you want to announce to the team?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPosting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center gap-2"
            >
              {isPosting && <Loader2 className="w-4 h-4 animate-spin" />}
              Post Announcement
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading announcements…</span>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-500 font-medium">Failed to load announcements</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl">
          <Megaphone className="w-10 h-10 opacity-25" />
          <p className="text-sm font-medium">
            {searchQuery ? "No announcements match your search." : "No announcements yet."}
          </p>
        </div>
      )}

      {/* Announcements list */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.announcementId}
              className="bg-white dark:bg-zinc-800/80 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3 gap-3">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {item.title}
                </h2>
                <span className="text-[11px] text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-zinc-900 px-3 py-1 rounded-full shrink-0">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </span>
              </div>

              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
                {item.content}
              </p>

              {/* Author */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  {(item.createdByName || "T")[0].toUpperCase()}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Posted by <span className="font-semibold text-slate-600 dark:text-slate-400">{item.createdByName || "Team"}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
