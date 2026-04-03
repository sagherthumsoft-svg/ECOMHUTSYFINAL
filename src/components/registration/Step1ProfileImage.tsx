"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Camera, Upload, User, AlertCircle, ArrowRight } from "lucide-react";
import { step1Schema, Step1FormData } from "@/lib/validationSchemas";

interface Step1Props {
  initialData: { profileImage: File | null };
  onNext: (data: { profileImage: File | null }) => void;
}

export default function Step1ProfileImage({ initialData, onNext }: Step1Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(initialData.profileImage);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFileError("");
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)) {
      setFileError("Please upload a JPG, PNG or WebP image.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Image must be less than 5MB.");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!file) {
      setFileError("Please upload a profile photo to continue.");
      return;
    }
    onNext({ profileImage: file });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Camera size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Photo</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload a clear, professional photo — this will appear on your employee profile For Portel.
        </p>
      </div>

      {/* Photo uploader */}
      <div className="flex flex-col items-center gap-6">
        {/* Avatar preview */}
        <motion.div
          className={`relative w-40 h-40 rounded-full overflow-hidden border-4 cursor-pointer transition-all ${isDragging
              ? "border-emerald-400 shadow-lg shadow-emerald-200 dark:shadow-emerald-900"
              : "border-slate-200 dark:border-zinc-600 hover:border-emerald-400"
            }`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <img src={preview} alt="Profile preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-700 dark:to-zinc-800 flex flex-col items-center justify-center gap-2">
              <User size={40} className="text-slate-400 dark:text-zinc-500" />
              <span className="text-xs text-slate-400 dark:text-zinc-500">Tap to upload</span>
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload size={24} className="text-white" />
          </div>
        </motion.div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {/* Drag & Drop zone */}
        <label
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragging
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
              : "border-slate-300 dark:border-zinc-600 hover:border-emerald-400 bg-white dark:bg-zinc-800"
            }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          htmlFor="profile-file-input"
        >
          <Upload size={18} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {file ? file.name : "Drag & drop or click to browse"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, WebP · Max 5MB</p>
          </div>
          <input
            id="profile-file-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>

        {fileError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-red-500 text-sm"
          >
            <AlertCircle size={14} />
            <span>{fileError}</span>
          </motion.div>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-4 text-sm space-y-1.5 text-slate-600 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">📋 Photo Guidelines</p>
        <p>• Clear, recent photo with your face visible</p>
        <p>• Professional attire (formal wear preferred)</p>
        <p>• Plain or neutral background</p>
        <p>• Minimum 200×200px resolution</p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all"
      >
        Continue to Personal Details
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
