"use client";

import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import NewChatModal from "@/components/modals/NewChatModal";
import { useChatStore } from "@/store/chatStore";
import { useAppStore } from "@/store/appStore";

export default function ChatsPage() {
  const { activeChat } = useChatStore();
  const { setActiveModal } = useAppStore();

  return (
    <>
      <div className="flex w-full h-full bg-[#efeae2] dark:bg-[#0b141a]">
        {/* Sidebar - Chat List */}
        <div className={`${activeChat ? "hidden md:flex" : "flex"} w-full md:w-[400px] border-r border-[#d1d7db] dark:border-[#222d34] h-full`}>
          <ChatSidebar />
        </div>

        {/* Main Chat Window */}
        <div className={`${activeChat ? "flex" : "hidden md:flex"} flex-1 h-full`}>
          {activeChat ? (
            <ChatWindow />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222d34]">
              <div className="w-80 h-44 mb-8 mx-auto bg-[url('/assets/ecomhutsy-logo.png')] bg-contain bg-no-repeat bg-center opacity-70"></div>
              <h1 className="text-3xl text-[#41525d] dark:text-[#e9edef] font-light mt-8">
                EcomHutsy Chats
              </h1>
              <p className="text-[#8696a0] mt-4 text-sm leading-6 mb-8">
                Send and receive messages seamlessly.
                <br />
                Keep your team connected with EcomHutsy.
              </p>
              <button
                onClick={() => setActiveModal("newChat")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-medium shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                Send a Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render the modal here */}
      <NewChatModal />
    </>
  );
}