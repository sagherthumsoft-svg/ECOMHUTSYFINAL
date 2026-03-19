"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { Notification } from "@/types";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useClickAway } from "react-use";

export default function NotificationsMenu() {
  const { dbUser } = useUserStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickAway(ref, () => setIsOpen(false));

  useEffect(() => {
    if (!dbUser?.uid) return;

    // Listen to notifications written by Cloud Functions / admin SDK
    const qMain = query(
      collection(db, "notifications"),
      where("receiverIds", "array-contains", dbUser.uid),
      orderBy("createdAt", "desc")
    );

    // Listen to clientNotifications written directly from client code
    // (chat / group / warehouse message notifications)
    const qClient = query(
      collection(db, "clientNotifications"),
      where("receiverIds", "array-contains", dbUser.uid),
      orderBy("createdAt", "desc")
    );

    let mainNotifs: Notification[] = [];
    let clientNotifs: Notification[] = [];

    const merge = () => {
      const combined = [...mainNotifs, ...clientNotifs].sort(
        (a, b) => b.createdAt - a.createdAt
      );
      setNotifications(combined);
    };

    const unsubMain = onSnapshot(qMain, (snapshot) => {
      mainNotifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Notification));
      merge();
    });

    const unsubClient = onSnapshot(qClient, (snapshot) => {
      clientNotifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Notification));
      merge();
    });

    return () => {
      unsubMain();
      unsubClient();
    };
  }, [dbUser?.uid]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification & { chatId?: string; groupId?: string; warehouseId?: string }) => {
    if (!notif.isRead) {
      // Try both collections — we don't store which collection the notif came from,
      // so we attempt both in sequence (one will succeed, other may 404 silently)
      try {
        await updateDoc(doc(db, "notifications", notif.id), { isRead: true });
      } catch {
        try {
          await updateDoc(doc(db, "clientNotifications", notif.id), { isRead: true });
        } catch { /* ignore */ }
      }
    }
    setIsOpen(false);

    // Dispatch event to allow sidebars to immediately open the specific chat
    if (notif.chatId) window.dispatchEvent(new CustomEvent("openChat", { detail: { type: "chat", id: notif.chatId } }));
    else if (notif.groupId) window.dispatchEvent(new CustomEvent("openChat", { detail: { type: "group", id: notif.groupId } }));
    else if (notif.warehouseId) window.dispatchEvent(new CustomEvent("openChat", { detail: { type: "warehouse", id: notif.warehouseId } }));

    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#202c33]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#202c33] rounded-xl shadow-xl border border-slate-100 dark:border-zinc-800 z-[9999] overflow-hidden flex flex-col max-h-[400px]">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-800/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                Nothing to see here
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-slate-100 dark:border-zinc-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${!notif.isRead ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {notif.type}
                    </span>
                    {notif.createdAt && (
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 mt-1 shrink-0">
                        {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
