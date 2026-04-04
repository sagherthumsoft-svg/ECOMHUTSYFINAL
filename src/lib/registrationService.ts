import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { RegistrationFormData, PendingUser } from "@/types/registration";

// ─── Upload a single file with progress ──────────────────────────────────────

export function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

// ─── Submit full registration ─────────────────────────────────────────────────

export async function submitRegistration(
  data: RegistrationFormData,
  onProgress?: (step: string, progress: number) => void
): Promise<string> {
  // Generate a unique submission ID prefix (will be Firestore doc ID)
  const submissionRef = doc(collection(db, "pending_users"));
  const submissionId = submissionRef.id;
  const basePath = `pending_uploads/${submissionId}`;

  onProgress?.("Uploading profile photo...", 0);
  const profileImageUrl = await uploadFile(
    data.step1.profileImage!,
    `${basePath}/profile_image`,
    (p) => onProgress?.("Uploading profile photo...", p)
  );

  onProgress?.("Uploading CNIC Front...", 0);
  const cnicFrontUrl = await uploadFile(
    data.step3.cnicFront!,
    `${basePath}/cnic_front`,
    (p) => onProgress?.("Uploading CNIC Front...", p)
  );

  onProgress?.("Uploading CNIC Back...", 0);
  const cnicBackUrl = await uploadFile(
    data.step3.cnicBack!,
    `${basePath}/cnic_back`,
    (p) => onProgress?.("Uploading CNIC Back...", p)
  );

  onProgress?.("Uploading guardian CNIC...", 0);
  const guardianCnicCopyUrl = await uploadFile(
    data.step3.guardianCnicCopy!,
    `${basePath}/guardian_cnic_copy`,
    (p) => onProgress?.("Uploading guardian CNIC...", p)
  );

  onProgress?.("Uploading degree certificate...", 0);
  const lastDegreeCertificateUrl = await uploadFile(
    data.step3.lastDegreeCertificate!,
    `${basePath}/degree_certificate`,
    (p) => onProgress?.("Uploading degree certificate...", p)
  );

  onProgress?.("Uploading employment form...", 0);
  const employmentFormUrl = await uploadFile(
    data.step3.employmentForm!,
    `${basePath}/employment_form`,
    (p) => onProgress?.("Uploading employment form...", p)
  );

  onProgress?.("Uploading employment contract...", 0);
  const employmentContractUrl = await uploadFile(
    data.step3.employmentContract!,
    `${basePath}/employment_contract`,
    (p) => onProgress?.("Uploading employment contract...", p)
  );

  onProgress?.("Uploading professional picture For Record...", 0);
  const professionalPictureUrl = await uploadFile(
    data.step3.professionalPicture!,
    `${basePath}/professional_picture`,
    (p) => onProgress?.("Uploading professional picture For Record...", p)
  );

  onProgress?.("Saving your application...", 90);

  const pendingUser: Omit<PendingUser, "id"> = {
    status: "pending",
    submittedAt: Date.now(),

    profileImageUrl,

    firstName: data.step2.firstName,
    lastName: data.step2.lastName,
    fullName: `${data.step2.firstName} ${data.step2.lastName}`,
    dateOfBirth: data.step2.dateOfBirth,
    cnic: data.step2.cnic,
    mobileNumber: data.step2.mobileNumber,
    personalEmail: data.step2.personalEmail,
    address: data.step2.address,

    cnicFrontUrl,
    cnicBackUrl,
    guardianCnicCopyUrl,
    lastDegreeCertificateUrl,
    employmentFormUrl,
    employmentContractUrl,
    professionalPictureUrl,

    guardianName: data.step4.guardianName,
    guardianCnic: data.step4.guardianCnic,
    guardianMobileNumber: data.step4.guardianMobileNumber,
    guardianAddress: data.step4.guardianAddress,
    emergencyContactNumber: data.step4.emergencyContactNumber,

    dateOfJoining: data.step5.dateOfJoining,
    bankName: data.step5.bankName,
    ibanNumber: data.step5.ibanNumber,
    designation: data.step5.designation,
    reportingManager: data.step5.reportingManager,
    teamName: data.step5.teamName,
  };

  // Use the pre-generated doc reference to write with a known ID
  const { setDoc } = await import("firebase/firestore");
  await setDoc(submissionRef, pendingUser);

  // Send notification to HR
  try {
    await fetch("/api/email/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pendingUser.fullName,
        email: pendingUser.personalEmail,
        submissionId
      })
    });
  } catch (err) {
    console.warn("Could not send HR notification email:", err);
  }

  onProgress?.("Application submitted!", 100);
  return submissionId;
}

// ─── Check registration status ────────────────────────────────────────────────

export async function checkRegistrationStatus(
  email: string
): Promise<{ status: string; rejectionReason?: string } | null> {
  try {
    const res = await fetch(`/api/registration/status?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.found) return null;

    return {
      status: data.status,
      rejectionReason: data.rejectionReason,
    };
  } catch (error) {
    console.error("Failed to check registration status:", error);
    return null;
  }
}

// ─── Check for duplicate submission ──────────────────────────────────────────

export async function hasPendingSubmission(email: string): Promise<boolean> {
  const accountInfo = await checkRegistrationStatus(email);
  return accountInfo?.status === "pending";
}
