"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

import StepIndicator from "@/components/registration/StepIndicator";
import Step1ProfileImage from "@/components/registration/Step1ProfileImage";
import Step2PersonalDetails from "@/components/registration/Step2PersonalDetails";
import Step3EmploymentDocs from "@/components/registration/Step3EmploymentDocs";
import Step4GuardianDetails from "@/components/registration/Step4GuardianDetails";
import Step5BankingInfo from "@/components/registration/Step5BankingInfo";
import RegistrationSuccess from "@/components/registration/RegistrationSuccess";

import { submitRegistration, hasPendingSubmission } from "@/lib/registrationService";
import { RegistrationFormData } from "@/types/registration";
import {
  Step1FormData,
  Step2FormData,
  Step3FormData,
  Step4FormData,
  Step5FormData,
} from "@/lib/validationSchemas";
import { Step3Data } from "@/types/registration";

// ─── Default empty states ─────────────────────────────────────────────────────
const defaultStep1 = { profileImage: null };
const defaultStep2: Step2FormData = {
  firstName: "", lastName: "", dateOfBirth: "", cnic: "",
  mobileNumber: "", personalEmail: "", address: "",
};
const defaultStep3: Step3Data = {
  cnicCopy: null, guardianCnicCopy: null, lastDegreeCertificate: null,
  employmentForm: null, employmentContract: null, professionalPicture: null,
};
const defaultStep4: Step4FormData = {
  guardianName: "", guardianCnic: "", guardianMobileNumber: "",
  guardianAddress: "", emergencyContactNumber: "",
};
const defaultStep5: Step5FormData = {
  dateOfJoining: "", bankName: "", ibanNumber: "",
  designation: "", reportingManager: "", teamName: "",
};

// ─── Slide animation variants ─────────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

export default function SignupPage() {
  const router = useRouter();
  const { authUser, isLoading } = useUserStore();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Accumulated form data
  const [step1Data, setStep1Data] = useState<{ profileImage: File | null }>(defaultStep1);
  const [step2Data, setStep2Data] = useState<Step2FormData>(defaultStep2);
  const [step3Data, setStep3Data] = useState<Step3Data>(defaultStep3);
  const [step4Data, setStep4Data] = useState<Step4FormData>(defaultStep4);
  const [step5Data, setStep5Data] = useState<Step5FormData>(defaultStep5);

  // Redirect already-logged-in users
  useEffect(() => {
    if (!isLoading && authUser) {
      router.replace("/dashboard/chats");
    }
  }, [isLoading, authUser, router]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleStep1 = (data: { profileImage: File | null }) => {
    setStep1Data(data);
    goNext();
  };

  const handleStep2 = (data: Step2FormData) => {
    setStep2Data(data);
    goNext();
  };

  const handleStep3 = (data: Step3Data) => {
    setStep3Data(data);
    goNext();
  };

  const handleStep4 = (data: Step4FormData) => {
    setStep4Data(data);
    goNext();
  };

  const handleStep5 = async (data: Step5FormData) => {
    setStep5Data(data);
    setIsSubmitting(true);

    try {
      // Check for duplicate pending submission
      const alreadyPending = await hasPendingSubmission(step2Data.personalEmail);
      if (alreadyPending) {
        toast.error("A pending application already exists for this email address.");
        setIsSubmitting(false);
        return;
      }

      const formData: RegistrationFormData = {
        step1: step1Data,
        step2: step2Data,
        step3: step3Data,
        step4: step4Data,
        step5: data,
      };

      const id = await submitRegistration(formData, (statusMsg, _progress) => {
        setUploadStatus(statusMsg);
      });

      setSubmissionId(id);
      toast.success("Application submitted successfully!");
      setDirection(1);
      setStep(6); // Success screen
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 dark:from-zinc-950 dark:via-emerald-950/10 dark:to-zinc-900 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-slate-200/80 dark:shadow-zinc-900/80 overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

          <div className="p-6 sm:p-8">
            {/* Logo + Title */}
            <div className="text-center mb-6">
              <img
                src="/assets/ecomhutsy-logo.png"
                alt="EcomHutsy Logo"
                className="w-36 mx-auto mb-4"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {step < 6 && (
                <>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Employee Registration
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Complete all steps to submit your application for HR review.
                  </p>
                </>
              )}
            </div>

            {/* Step indicator (only for steps 1–5) */}
            {step >= 1 && step <= 5 && (
              <div className="mb-8">
                <StepIndicator currentStep={step} />
              </div>
            )}

            {/* Step content with animation */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {step === 1 && (
                  <Step1ProfileImage
                    initialData={step1Data}
                    onNext={handleStep1}
                  />
                )}
                {step === 2 && (
                  <Step2PersonalDetails
                    initialData={step2Data}
                    onNext={handleStep2}
                    onBack={goBack}
                  />
                )}
                {step === 3 && (
                  <Step3EmploymentDocs
                    initialData={step3Data}
                    onNext={handleStep3}
                    onBack={goBack}
                  />
                )}
                {step === 4 && (
                  <Step4GuardianDetails
                    initialData={step4Data}
                    onNext={handleStep4}
                    onBack={goBack}
                  />
                )}
                {step === 5 && (
                  <Step5BankingInfo
                    initialData={step5Data}
                    onSubmit={handleStep5}
                    onBack={goBack}
                    isSubmitting={isSubmitting}
                    uploadStatus={uploadStatus}
                  />
                )}
                {step === 6 && submissionId && (
                  <RegistrationSuccess
                    submissionId={submissionId}
                    email={step2Data.personalEmail}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer link */}
        {step < 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-5"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors"
              >
                Sign in
              </button>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
