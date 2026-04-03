"use client";

import { useState, useRef } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { useHRNotices } from "@/hooks/useHRNotices";
import { Notice } from "@/types";
import { logActivity, createNotification } from "@/lib/hrUtils";
import {
  ChevronRight,
  FileText,
  Plus,
  X,
  Loader2,
  Download,
  Trash2,
  Upload,
  FileIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

export default function HRNotices() {
  const { dbUser } = useUserStore();
  const { notices, loading } = useHRNotices();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetForm = () => {
    setForm({ title: "", description: "" });
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.description.trim()) return toast.error("Description is required");

    setSubmitting(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const storageRef = ref(storage, `notices/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snap) => {
              const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setUploadProgress(progress);
            },
            reject,
            async () => {
              fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              fileName = selectedFile.name;
              resolve();
            }
          );
        });
      }

      const noticeData = {
        title: form.title.trim(),
        description: form.description.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        createdAt: Date.now(),
        createdBy: dbUser?.uid || "",
        createdByName: dbUser?.name || "HR",
      };

      await addDoc(collection(db, "notices"), noticeData);
      await logActivity("CREATE", "notices", `Created notice: ${form.title}`, dbUser?.uid || "", dbUser?.name);

      // Notify
      await createNotification(
        [dbUser?.uid || ""],
        "New Notice",
        `Notice: ${form.title.trim()}`
      );

      toast.success("Notice created successfully!");
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create notice");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (notice: Notice) => {
    if (!notice.id) return;
    if (!confirm(`Delete notice "${notice.title}"?`)) return;

    setDeletingId(notice.id);
    try {
      // Delete file from storage if exists
      if (notice.fileUrl) {
        try {
          const fileRef = ref(storage, notice.fileUrl);
          await deleteObject(fileRef);
        } catch {
          // File might already be deleted, ignore
        }
      }

      await deleteDoc(doc(db, "notices", notice.id));
      await logActivity("DELETE", "notices", `Deleted notice: ${notice.title}`, dbUser?.uid || "", dbUser?.name);
      toast.success("Notice deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-cyan-50 dark:bg-cyan-900/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>HR Manager</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">Notices</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{notices.length} notice{notices.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); resetForm(); }}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Create Notice"}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-cyan-50/50 dark:bg-cyan-900/5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Title *</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition"
                placeholder="Notice title…"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Description *</label>
              <textarea
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-slate-100 text-sm transition resize-none"
                rows={3}
                placeholder="Detailed notice content…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>
            {/* File Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Attachment (optional, max 10MB)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-cyan-400 transition group"
              >
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition" />
                <span className="text-sm text-slate-400 group-hover:text-cyan-500 transition truncate">
                  {selectedFile ? selectedFile.name : "Click to upload file (PDF, Image, DOC…)"}
                </span>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-auto p-1 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls"
              />
              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting && uploadProgress !== null ? `Uploading ${uploadProgress}%…` : "Post Notice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notices List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No notices yet</p>
            <p className="text-xs mt-1">Create your first notice above</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 rounded-2xl p-5 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{notice.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(notice.createdAt, { addSuffix: true })}
                  </span>
                  <button
                    onClick={() => handleDelete(notice)}
                    disabled={deletingId === notice.id}
                    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === notice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {notice.description}
              </p>

              {notice.fileUrl && (
                <a
                  href={notice.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={notice.fileName}
                  className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/30 text-cyan-700 dark:text-cyan-400 text-xs font-semibold rounded-xl hover:bg-cyan-100 transition"
                >
                  <FileIcon className="w-3.5 h-3.5" />
                  {notice.fileName || "Download Attachment"}
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-700 text-xs text-slate-400">
                By <span className="font-semibold text-slate-500">{notice.createdByName || "HR"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
