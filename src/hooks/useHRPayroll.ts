"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PayrollRecord } from "@/types";

// Returns payroll records for a given month (YYYY-MM).
// If month is omitted, returns all payroll records.
export function useHRPayroll(month?: string) {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let q;
    try {
      if (month) {
        q = query(
          collection(db, "payroll"),
          where("month", "==", month),
          orderBy("createdAt", "asc")
        );
      } else {
        q = query(collection(db, "payroll"), orderBy("createdAt", "desc"));
      }

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as PayrollRecord[];
          setRecords(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          if (!isMounted) return;
          console.error("useHRPayroll Listener Error:", err);
          setError(err.message || "Failed to load payroll records");
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [month]);

  return { records, loading, error };
}
