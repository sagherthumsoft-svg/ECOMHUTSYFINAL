// ─── Registration Types ───────────────────────────────────────────────────────

export interface Step1Data {
  profileImage: File | null;
  profileImageUrl?: string;
}

export interface Step2Data {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  cnic: string;
  mobileNumber: string;
  personalEmail: string;
  address: string;
}

export interface Step3Data {
  cnicCopy: File | null;
  guardianCnicCopy: File | null;
  lastDegreeCertificate: File | null;
  employmentForm: File | null;
  employmentContract: File | null;
  professionalPicture: File | null;
  // URLs after upload
  cnicCopyUrl?: string;
  guardianCnicCopyUrl?: string;
  lastDegreeCertificateUrl?: string;
  employmentFormUrl?: string;
  employmentContractUrl?: string;
  professionalPictureUrl?: string;
}

export interface Step4Data {
  guardianName: string;
  guardianCnic: string;
  guardianMobileNumber: string;
  guardianAddress: string;
  emergencyContactNumber: string;
}

export interface Step5Data {
  dateOfJoining: string;
  bankName: string;
  ibanNumber: string;
  designation: string;
  reportingManager: string;
  teamName: string;
}

export interface RegistrationFormData {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
}

// ─── Pending User (Firestore Document) ────────────────────────────────────────

export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface PendingUser {
  id?: string;
  status: RegistrationStatus;
  submittedAt: number;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: number;

  // Step data (flattened URLs)
  profileImageUrl: string;

  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  cnic: string;
  mobileNumber: string;
  personalEmail: string;
  address: string;

  cnicCopyUrl: string;
  guardianCnicCopyUrl: string;
  lastDegreeCertificateUrl: string;
  employmentFormUrl: string;
  employmentContractUrl: string;
  professionalPictureUrl: string;

  guardianName: string;
  guardianCnic: string;
  guardianMobileNumber: string;
  guardianAddress: string;
  emergencyContactNumber: string;

  dateOfJoining: string;
  bankName: string;
  ibanNumber: string;
  designation: string;
  reportingManager: string;
  teamName: string;
}

// ─── Upload Progress ───────────────────────────────────────────────────────────
export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "idle" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}
