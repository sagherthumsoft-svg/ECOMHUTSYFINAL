"use client";

import { useUserStore } from "@/store/userStore";
import { usePathname, useRouter } from "next/navigation";
import { cn, isAdmin } from "@/lib/utils";
import { Menu, Search } from "lucide-react";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import OptionsMenu from "@/components/layout/OptionsMenu";
import { useAppStore } from "@/store/appStore";
import { useChatStore } from "@/store/chatStore";
import { useGroupStore } from "@/store/groupStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { usePermissionStore, FeatureKey } from "@/store/permissionStore";
import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
function getLastRead(chatId: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`lastRead_${chatId}`) || "0", 10);
}

export function markChatRead(chatId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`lastRead_${chatId}`, Date.now().toString());
}

function getLastReadAnnouncements(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("lastReadAnnouncements") || "0", 10);
}

export function markAnnouncementsRead(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("lastReadAnnouncements", Date.now().toString());
}

// ─────────────────────────────────────────────
// AppBar
// ─────────────────────────────────────────────
export default function AppBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { dbUser } = useUserStore();
  const pathname = usePathname();
  const router = useRouter();
  const { searchQuery, setSearchQuery, showSearchBar, setShowSearchBar } = useAppStore();
  const { setActiveChat } = useChatStore();
  const { setActiveGroup } = useGroupStore();
  const { setActiveWarehouse } = useWarehouseStore();
  const { permissions } = usePermissionStore();

  const handleTabClick = (path: string) => {
    // Reset all active states before navigating
    setActiveChat(null);
    setActiveGroup(null);
    setActiveWarehouse(null);
    router.push(path);
  };

  const allTabs = [
    { name: "Chats", path: "/dashboard/chats", feature: "chats" },
    { name: "Groups", path: "/dashboard/groups", feature: "groups" },
    { name: "Warehouses", path: "/dashboard/warehouses", feature: "warehouses" },
    { name: "Announcements", path: "/dashboard/announcements", feature: "announcements" },
    { name: "Tasks", path: "/dashboard/tasks", feature: "tasks" },
  ];

  const [counts, setCounts] = useState<Record<string, number>>({});
  // Tick counter to force re-evaluation when localStorage changes
  const [readTick, setReadTick] = useState(0);

  // Expose a way for sidebars to trigger a re-evaluation
  const bumpReadTick = useCallback(() => setReadTick((t) => t + 1), []);

  // Listen for custom "chatRead" events fired by sidebars when a chat is opened
  useEffect(() => {
    const handler = () => bumpReadTick();
    window.addEventListener("chatRead", handler);
    return () => window.removeEventListener("chatRead", handler);
  }, [bumpReadTick]);

  useEffect(() => {
    if (!dbUser?.uid || !db) return;

    const uid = dbUser.uid;
    const unsubs: (() => void)[] = [];

    // ── Chats (direct) ──────────────────────────────────────────────────
    unsubs.push(
      onSnapshot(
        query(collection(db, "chats"), where("memberIds", "array-contains", uid)),
        (snap) => {
          const now = Date.now();
          let chatUnread = 0;
          let groupUnread = 0;
          let warehouseUnread = 0;

          snap.docs.forEach((d) => {
            const data = d.data();
            const type = data.type || "direct";
            const lastSenderId: string = data.lastMessageSenderId || data.lastMessage?.senderId || "";
            const lastMsgAt: number =
              typeof data.updatedAt === "number"
                ? data.updatedAt
                : data.updatedAt?.toMillis?.() ||
                  typeof data.lastMessageAt === "number"
                  ? data.lastMessageAt
                  : data.lastMessageAt?.toMillis?.() || 
                    typeof data.lastMessageTime === "number"
                    ? data.lastMessageTime
                    : data.lastMessageTime?.toMillis?.() || 0;

            // Skip if no message ever sent
            if (!lastMsgAt) return;
            // Skip if the last message was sent by me
            if (lastSenderId === uid) return;
            // Skip if I've already read up to this point
            if (lastMsgAt <= getLastRead(d.id)) return;

            if (type === "direct") chatUnread++;
            else if (type === "group") groupUnread++;
            else if (type === "warehouse") warehouseUnread++;
          });

          setCounts((prev) => ({
            ...prev,
            "/dashboard/chats": chatUnread,
            "/dashboard/groups": groupUnread,
            "/dashboard/warehouses": warehouseUnread,
          }));
        }
      )
    );

    // ── Announcements ────────────────────────────────────────────────────
    unsubs.push(
      onSnapshot(collection(db, "announcements"), (snap) => {
        const lastSeen = getLastReadAnnouncements();
        let unread = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          const createdAt: number =
            typeof data.createdAt === "number"
              ? data.createdAt
              : data.createdAt?.toMillis?.() || 0;
          // Don't count announcements created by me
          if (data.createdBy === uid) return;
          if (createdAt > lastSeen) unread++;
        });
        setCounts((prev) => ({ ...prev, "/dashboard/announcements": unread }));
      })
    );

    // ── Tasks (pending, assigned to me) ──────────────────────────────────
    unsubs.push(
      onSnapshot(
        query(
          collection(db, "tasks"),
          where("assignedTo", "==", uid),
          where("status", "==", "pending")
        ),
        (snap) => {
          setCounts((prev) => ({ ...prev, "/dashboard/tasks": snap.size }));
        }
      )
    );

    return () => unsubs.forEach((fn) => fn());
  // Re-run when localStorage changes (readTick bumped by chatRead events)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser?.uid, dbUser?.role, readTick]);

  // Mark the current tab as read when the user is on it
  useEffect(() => {
    if (pathname.startsWith("/dashboard/announcements")) {
      markAnnouncementsRead();
      setCounts((prev) => ({ ...prev, "/dashboard/announcements": 0 }));
    }
  }, [pathname]);

  const tabs = allTabs.filter((tab) => {
    if (!dbUser?.role) return false;
    if (isAdmin(dbUser.role)) return true;
    
    const rolePermissions = permissions[dbUser.role as Exclude<typeof dbUser.role, "owner">];
    return rolePermissions?.[tab.feature as FeatureKey];
  });

  return (
    <div className="h-16 w-full flex items-center justify-between px-4 bg-emerald-600 dark:bg-[#202c33] shadow-md flex-shrink-0 z-50">
      {/* Left */}
      <div className="flex items-center gap-4">
        {(dbUser?.role === "owner" || dbUser?.role === "head" || dbUser?.role === "manager") && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}
        <img
          src="/assets/ecomhutsy-logo.png"
          alt="EcomHutsy Logo"
          className="h-8 w-auto"
        />
        <h1 className="text-xl font-bold text-white tracking-tight">
          EcomHutsy
        </h1>
      </div>

      {/* Center Tabs */}
      <div className="hidden md:flex items-center space-x-1">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          const count = counts[tab.path] ?? 0;
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-emerald-100 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-zinc-800"
              )}
            >
              {tab.name}
              {count > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-2">
        {showSearchBar ? (
          <div className="flex items-center bg-white/10 dark:bg-zinc-800 rounded-full px-3 py-1 border border-white/20 dark:border-zinc-700 transition-all">
            <Search className="w-4 h-4 text-emerald-50" />
            <input
              type="text"
              autoFocus
              className="bg-transparent border-none outline-none text-sm px-2 w-32 md:w-48 text-white placeholder-emerald-100"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => setShowSearchBar(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearchBar(true)}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <Search className="w-5 h-5 text-white" />
          </button>
        )}

        <NotificationsMenu />
        <OptionsMenu />
      </div>
    </div>
  );
}
