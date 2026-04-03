"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Image, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  acceptLabel?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  maxSizeMB?: number;
}

export default function FileUploadField({
  label,
  accept = "image/*,application/pdf",
  acceptLabel = "JPG, PNG or PDF",
  value,
  onChange,
  error,
  required = true,
  maxSizeMB = 5,
}: FileUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) return;
      onChange(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [onChange, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
  };

  const isImage = value?.type?.startsWith("image/");

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden"
          >
            {preview && isImage ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-28 object-cover"
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {value.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(value.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
              </div>
            )}

            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
            >
              <X size={12} />
            </button>

            {preview && isImage && (
              <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-t border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
                  {value.name}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.label
            key="dropzone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            htmlFor={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all
              ${isDragging
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-slate-300 dark:border-zinc-600 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
              }
              ${error ? "border-red-400 dark:border-red-600" : ""}
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-zinc-700"}`}>
                <Upload size={18} className={isDragging ? "text-emerald-600" : "text-slate-400"} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {acceptLabel} · Max {maxSizeMB}MB
                </p>
              </div>
            </div>
            <input
              id={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleChange}
            />
          </motion.label>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-red-500"
        >
          <AlertCircle size={13} />
          <p className="text-xs">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
