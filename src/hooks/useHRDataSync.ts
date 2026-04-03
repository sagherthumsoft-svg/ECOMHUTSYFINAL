"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

const VALID_DEPARTMENTS = [
  "Zain Team",
  "Asim Team",
  "Sajid Team",
  "Awais Yousaf Team",
  "Kashif Team",
  "Waseel Team",
];

export function useHRDataSync(isAdmin: boolean) {
  const [syncing, setSyncing] = useState(false);

  const runCleanup = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    const toastId = toast.loading("Syncing HR departments...");

    try {
      const snap = await getDocs(collection(db, "employees"));
      const batch = writeBatch(db);
      let count = 0;

      snap.docs.forEach((d) => {
        const data = d.data();
        if (!VALID_DEPARTMENTS.includes(data.department)) {
          batch.update(doc(db, "employees", d.id), {
            department: "Unassigned",
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`Cleaned up ${count} invalid departments`, { id: toastId });
      } else {
        toast.success("All departments are valid", { id: toastId });
      }
    } catch (err: any) {
      console.error("Cleanup Error:", err);
      toast.error("Cleanup failed: " + err.message, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, runCleanup };
}
