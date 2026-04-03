"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, ArrowLeft } from "lucide-react";
import FileUploadField from "./FileUploadField";
import { Step3Data } from "@/types/registration";

interface Step3Props {
  initialData: Step3Data;
  onNext: (data: Step3Data) => void;
  onBack: () => void;
}

const DOC_FIELDS: { key: keyof Step3Data; label: string; accept?: string; acceptLabel?: string; isImage?: boolean }[] = [
  { key: "cnicCopy", label: "CNIC Copy (Front & Back)", acceptLabel: "JPG, PNG or PDF" },
  { key: "guardianCnicCopy", label: "Guardian CNIC Copy", acceptLabel: "JPG, PNG or PDF" },
  {
    key: "lastDegreeCertificate",
    label: "Last Degree Certificate",
    acceptLabel: "JPG, PNG or PDF",
  },
  { key: "employmentForm", label: "Employment Form", acceptLabel: "JPG, PNG or PDF" },
  { key: "employmentContract", label: "Employment Contract", acceptLabel: "JPG, PNG or PDF" },
  {
    key: "professionalPicture",
    label: "Professional Picture For Record",
    accept: "image/jpeg,image/jpg,image/png,image/webp",
    acceptLabel: "JPG, PNG or WebP",
    isImage: true,
  },
];

export default function Step3EmploymentDocs({ initialData, onNext, onBack }: Step3Props) {
  const [files, setFiles] = useState<Step3Data>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof Step3Data, string>>>({});

  const handleChange = (key: keyof Step3Data, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (file) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleNext = () => {
    const newErrors: Partial<Record<keyof Step3Data, string>> = {};
    const fileKeys: (keyof Step3Data)[] = [
      "cnicCopy",
      "guardianCnicCopy",
      "lastDegreeCertificate",
      "employmentForm",
      "employmentContract",
      "professionalPicture",
    ];

    let hasError = false;
    fileKeys.forEach((key) => {
      if (!files[key]) {
        newErrors[key] = "This document is required";
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }
    onNext(files);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <FileText size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Employment Documents</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload clear, legible copies of all required documents.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-start gap-2.5">
        <span className="text-amber-500 mt-0.5">⚠️</span>
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-0.5">Secure Document Handling</p>
          <p>All documents are encrypted and stored securely. Only HR personnel can access your files.</p>
        </div>
      </div>

      <div className="space-y-4">
        {DOC_FIELDS.map((field) => (
          <FileUploadField
            key={field.key}
            label={field.label}
            accept={field.accept || "image/*,application/pdf"}
            acceptLabel={field.acceptLabel}
            value={files[field.key] as File | null}
            onChange={(file) => handleChange(field.key, file)}
            error={errors[field.key]}
          />
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium text-sm transition-all"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 transition-all"
        >
          Continue to Guardian Details
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
