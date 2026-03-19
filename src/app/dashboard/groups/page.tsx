"use client";

import GroupSidebar from "@/components/chat/GroupSidebar";
import GroupWindow from "@/components/chat/GroupWindow";
import { useGroupStore } from "@/store/groupStore";
import { Users } from "lucide-react";

export default function GroupsPage() {
  const { activeGroup } = useGroupStore();

  return (
    <div className="flex w-full h-full bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Sidebar - Group List */}
      <div className={`${activeGroup ? "hidden md:flex" : "flex"} w-full md:w-[400px] border-r border-[#d1d7db] dark:border-[#222d34] h-full`}>
        <GroupSidebar />
      </div>

      {/* Main Chat Window */}
      <div className={`${activeGroup ? "flex" : "hidden md:flex"} flex-1 h-full`}>
        {activeGroup ? (
          <GroupWindow />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222d34]">
            {/* Empty state resembling WhatsApp Web */}
            <div className="max-w-md text-center flex flex-col items-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-xl">
                 <Users className="w-12 h-12 text-emerald-600 dark:text-emerald-500" />
              </div>
              <h1 className="text-3xl text-[#41525d] dark:text-[#e9edef] font-light mt-4">
                EcomHutsy Groups
              </h1>
              <p className="text-[#8696a0] mt-4 text-sm leading-6">
                Collaborate efficiently across your departments.
                <br />
                Select a group to start messaging your team simultaneously.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
