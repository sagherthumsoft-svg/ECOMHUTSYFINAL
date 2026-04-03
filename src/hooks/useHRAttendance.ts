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
import { AttendanceRecord } from "@/types";

// Returns all attendance records for a given date (YYYY-MM-DD).
// If date is omitted, returns all records.
export function useHRAttendance(date?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let q;
    try {
      if (date) {
        q = query(
          collection(db, "attendance"),
          where("date", "==", date),
          orderBy("createdAt", "asc")
        );
      } else {
        q = query(collection(db, "attendance"), orderBy("createdAt", "desc"));
      }

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AttendanceRecord[];
          setRecords(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          if (!isMounted) return;
          console.error("useHRAttendance Listener Error:", err);
          setError(err.message || "Failed to load attendance records");
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err.message || "Failed to initialize attendance query");
        setLoading(false);
      }
    }
  }, [date]);

  return { records, loading, error };
}

// Returns attendance records for a specific employee over all dates
export function useHREmployeeAttendance(employeeId?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!employeeId) {
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, "attendance"),
      where("employeeId", "==", employeeId),
      orderBy("date", "desc")
    );
    
    const unsubscribe = onSnapshot(q, 
      (snap) => {
        if (!isMounted) return;
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        console.error("useHREmployeeAttendance Listener Error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [employeeId]);

  return { records, loading, error };
}
