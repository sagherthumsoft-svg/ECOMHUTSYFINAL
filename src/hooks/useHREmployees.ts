"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Employee } from "@/types";

export function useHREmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, "employees"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return;
        try {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Employee[];
          setEmployees(data);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error("useHREmployees Snapshot Error:", err);
          setError(err.message || "Failed to process employees data");
        }
      },
      (err) => {
        if (!isMounted) return;
        console.error("useHREmployees Listener Error:", err);
        setError(err.message || "Failed to load employees");
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { employees, loading, error };
}
