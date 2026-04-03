import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Activity Logger ──────────────────────────────────────────────────────────
export async function logActivity(
  action: string,
  module: string,
  details: string,
  userId: string,
  userName?: string
): Promise<void> {
  try {
    await addDoc(collection(db, "activityLogs"), {
      action,
      module,
      details,
      userId,
      userName: userName || "",
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("Activity log failed:", err);
  }
}

// ─── Notification Creator ─────────────────────────────────────────────────────
export async function createNotification(
  receiverIds: string[],
  type: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      receiverIds,
      type,
      message,
      isRead: false,
      createdAt: Date.now(),
      link: link || null,
    });
  } catch (err) {
    console.warn("Notification creation failed:", err);
  }
}

// ─── Employee ID Generator ────────────────────────────────────────────────────
// Uses a Firestore counter document to prevent duplicates
export async function generateEmployeeId(): Promise<string> {
  const counterRef = doc(db, "settings", "hrCounters");

  try {
    const newId = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().employeeCount || 0) : 0;
      const next = current + 1;
      tx.set(counterRef, { employeeCount: next }, { merge: true });
      return next;
    });
    return `EMP-${String(newId).padStart(4, "0")}`;
  } catch {
    // Fallback: timestamp-based ID
    return `EMP-${Date.now().toString().slice(-6)}`;
  }
}

// ─── Late Time Config ─────────────────────────────────────────────────────────
export async function getLateThreshold(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "settings", "hrConfig"));
    if (snap.exists() && snap.data().lateThreshold) {
      return snap.data().lateThreshold as string;
    }
  } catch {
    // ignore
  }
  return "09:30";
}

export async function setLateThreshold(time: string): Promise<void> {
  await setDoc(doc(db, "settings", "hrConfig"), { lateThreshold: time }, { merge: true });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCurrentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(","),
    ...data.map((row) =>
      keys
        .map((k) => {
          const val = row[k] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
