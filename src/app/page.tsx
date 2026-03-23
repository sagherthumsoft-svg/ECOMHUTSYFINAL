"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function Home() {
  const router = useRouter();
  const { authUser, isLoading } = useUserStore();

  useEffect(() => {
    // Safety timeout: if loading doesn't resolve in 5s, fallback to login
    const timer = setTimeout(() => {
      if (isLoading) router.replace("/login");
    }, 5000);

    if (!isLoading) {
      clearTimeout(timer);
      if (authUser) {
        router.replace("/dashboard/chats");
      } else {
        router.replace("/login");
      }
    }
    return () => clearTimeout(timer);
  }, [isLoading, authUser, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-zinc-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );
}
