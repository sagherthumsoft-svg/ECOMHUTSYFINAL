import { z } from "zod";
import { PAKISTANI_BANKS, TEAMS } from "@/lib/constants";


// ─── Reusable validators ──────────────────────────────────────────────────────

const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
const ibanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/;
const pkPhoneRegex = /^(\+92|0)[3][0-9]{9}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const fileSchema = (label: string) =>
  z
    .any()
    .refine((file) => file instanceof File, `${label} is required`)
    .refine((file) => file?.size <= MAX_FILE_SIZE, `${label} must be less than 5MB`)
    .refine(
      (file) => ACCEPTED_DOC_TYPES.includes(file?.type),
      `${label} must be a PDF or image (JPG, PNG)`
    );

const imageFileSchema = (label: string) =>
  z
    .any()
    .refine((file) => file instanceof File, `${label} is required`)
    .refine((file) => file?.size <= MAX_FILE_SIZE, `${label} must be less than 5MB`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
      `${label} must be an image (JPG, PNG, WebP)`
    );

// ─── Step 1: Profile Image ─────────────────────────────────────────────────────

export const step1Schema = z.object({
  profileImage: imageFileSchema("Profile image"),
});

// ─── Step 2: Personal Details ──────────────────────────────────────────────────

export const step2Schema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name is too long"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      const dob = new Date(val);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 65;
    }, "Must be between 18 and 65 years old"),
  cnic: z
    .string()
    .regex(cnicRegex, "CNIC must follow format: 12345-1234567-1"),
  mobileNumber: z
    .string()
    .regex(pkPhoneRegex, "Enter a valid Pakistani mobile number (e.g. 03001234567)"),
  personalEmail: z.string().email("Enter a valid email address"),
  address: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(300, "Address is too long"),
});

// ─── Step 3: Employment Documents ─────────────────────────────────────────────

export const step3Schema = z.object({
  cnicCopy: fileSchema("CNIC Copy"),
  guardianCnicCopy: fileSchema("Guardian CNIC Copy"),
  lastDegreeCertificate: fileSchema("Last Degree Certificate"),
  employmentForm: fileSchema("Employment Form"),
  employmentContract: fileSchema("Employment Contract"),
  professionalPicture: imageFileSchema("Professional Picture For Record"),
});

// ─── Step 4: Guardian Details ──────────────────────────────────────────────────

export const step4Schema = z.object({
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianCnic: z.string().regex(cnicRegex, "Guardian CNIC must follow format: 12345-1234567-1"),
  guardianMobileNumber: z
    .string()
    .regex(pkPhoneRegex, "Enter a valid Pakistani mobile number"),
  guardianAddress: z.string().min(10, "Guardian address must be at least 10 characters"),
  emergencyContactNumber: z
    .string()
    .regex(pkPhoneRegex, "Enter a valid Pakistani mobile number"),
});

// ─── Step 5: Banking & Employment Info ────────────────────────────────────────

export const step5Schema = z.object({
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  bankName: z.string().min(2, "Bank name is required"),
  ibanNumber: z
    .string()
    .regex(ibanRegex, "IBAN must follow format: PK36SCBL0000001123456702"),
  designation: z.string().min(2, "Designation is required"),
  reportingManager: z.enum(TEAMS, {
    message: "Please select a valid Reporting Head",
  }),
  teamName: z.enum(TEAMS, {
    message: "Please select a valid Team",
  }),
});

// ─── Combined Type Exports ─────────────────────────────────────────────────────
export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;
export type Step4FormData = z.infer<typeof step4Schema>;
export type Step5FormData = z.infer<typeof step5Schema>;
