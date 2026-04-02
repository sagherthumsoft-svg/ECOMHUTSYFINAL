"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MoreVertical, 
  Moon, 
  Sun, 
  Settings, 
  UserCircle, 
  LogOut, 
  Users, 
  Building2, 
  Megaphone, 
  CheckSquare, 
  Calendar, 
  Clock, 
  DollarSign, 
  MessageSquare 
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useAppStore } from "@/store/appStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useClickAway } from "react-use";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function OptionsMenu() {
  const { dbUser, clearSession } = useUserStore();
  const { setActiveModal } = useAppStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickAway(ref, () => setIsOpen(false));

  useEffect(() => {
    // Check initial dark mode from document class
    if (document.documentElement.classList.contains("dark")) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
    clearSession();
  };

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#202c33] rounded-xl shadow-xl border border-slate-100 dark:border-zinc-800 z-50 overflow-hidden flex flex-col p-2">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 mb-1 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
              <img 
                src="/assets/only-logo.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <div className="flex flex-col overflow-hidden">
               <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{dbUser?.name}</span>
               <span className="text-xs text-slate-500 capitalize truncate">{dbUser?.role}</span>
            </div>
          </div>

          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span className="flex items-center">
              {isDarkMode ? <Sun className="w-4 h-4 mr-3 opacity-70" /> : <Moon className="w-4 h-4 mr-3 opacity-70" />}
              Dark Mode
            </span>
            <div className={`w-8 h-4 rounded-full transition-colors relative ${isDarkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4' : ''}`}></div>
            </div>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          {/* New Options */}
          <button 
            onClick={() => { setActiveModal("manageGroups"); setIsOpen(false); }}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Users className="w-4 h-4 mr-3 opacity-70" /> Your Groups
          </button>

          <button 
            onClick={() => { setActiveModal("manageWarehouses"); setIsOpen(false); }}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Building2 className="w-4 h-4 mr-3 opacity-70" /> Your Warehouses
          </button>

          <button 
            onClick={() => { router.push("/dashboard/announcements"); setIsOpen(false); }}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Megaphone className="w-4 h-4 mr-3 opacity-70" /> Announcements
          </button>

          <button 
            onClick={() => { setActiveModal("createTask"); setIsOpen(false); }}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <CheckSquare className="w-4 h-4 mr-3 opacity-70" /> My Tasks
          </button>

          <button 
            onClick={() => toast.success("Leaves coming soon! 🚀")}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-3 opacity-70" /> Leaves
          </button>

          <button 
            onClick={() => toast.success("Short leaves coming soon! 🚀")}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Clock className="w-4 h-4 mr-3 opacity-70" /> Short leaves
          </button>

          <button 
            onClick={() => toast.success("Loan coming soon! 🚀")}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <DollarSign className="w-4 h-4 mr-3 opacity-70" /> Loan
          </button>

          <button 
            onClick={() => toast.success("Advance Salary coming soon! 🚀")}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <DollarSign className="w-4 h-4 mr-3 opacity-70" /> Advance Salary
          </button>

          <button 
            onClick={() => toast.success("Complaints coming soon! 🚀")}
            className="flex items-center w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <MessageSquare className="w-4 h-4 mr-3 opacity-70" /> Complaints
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-sm text-red-600 dark:text-red-400 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3 opacity-70" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
