import { X, Search, FileText, ImageIcon, PlaySquare, File, Calendar, Users } from "lucide-react";
import { Message, User as AppUser } from "@/types";
import { useState, useMemo } from "react";
import { format } from "date-fns";

type RightPanelMode = "info" | "media" | "search";

interface RightPanelProps {
  mode: RightPanelMode;
  onClose: () => void;
  messages: Message[];
  chatData?: {
    name: string;
    image?: string;
    description?: string;
    createdAt?: number;
    membersCount?: number;
  };
  members?: any[]; // Users array for groups/warehouses
}

export default function RightPanel({ mode, onClose, messages, chatData, members }: RightPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const mediaMessages = useMemo(() => {
    return messages.filter(
      (m) =>
        m.type === "image" ||
        m.type === "video" ||
        m.type === "pdf" ||
        m.type === "file" ||
        m.messageType === "image" ||
        m.messageType === "video" ||
        m.messageType === "pdf" ||
        m.messageType === "file"
    );
  }, [messages]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQ = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.text?.toLowerCase().includes(lowerQ) ||
        m.fileName?.toLowerCase().includes(lowerQ)
    );
  }, [messages, searchQuery]);

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-4 px-5 py-4 bg-[#202C33] text-[#E9EDEF] shadow-sm shrink-0" style={{ height: "60px" }}>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
        <X className="w-5 h-5" />
      </button>
      <span className="font-medium">{title}</span>
    </div>
  );

  return (
    <div className="w-[380px] h-full bg-[#111B21] border-l border-[#2A3942] flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-200">
      {mode === "search" && (
        <>
          {renderHeader("Search Messages")}
          <div className="p-4 bg-[#111B21] border-b border-[#2A3942] shrink-0">
            <div className="bg-[#202C33] rounded-lg flex items-center px-3 py-2">
              <Search className="w-4 h-4 text-[#8696A0] mr-2" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[#E9EDEF] w-full text-sm placeholder-[#8696A0]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto chat-scroll p-4 space-y-4">
            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-center text-[#8696A0] text-sm mt-10">No messages found.</p>
            )}
            {searchResults.map((m) => (
              <div key={m.id || m.messageId} className="bg-[#202C33] p-3 rounded-lg flex flex-col gap-1 cursor-pointer hover:bg-[#2A3942] transition">
                <span className="text-xs text-[#8696A0] font-medium block">
                  {format(new Date(m.createdAt || Date.now()), "dd/MM/yyyy HH:mm")}
                </span>
                <p className="text-[#E9EDEF] text-sm line-clamp-3">
                  {m.text || m.fileName || "Media message"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === "media" && (
        <>
          {renderHeader("Media, Links, and Docs")}
          <div className="flex-1 overflow-y-auto chat-scroll p-2">
            {mediaMessages.length === 0 ? (
              <p className="text-center text-[#8696A0] text-sm mt-10">No media found.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {mediaMessages.map((m) => {
                  const type = m.type || m.messageType;
                  return (
                    <div key={m.id || m.messageId} className="aspect-square bg-[#202C33] relative group overflow-hidden cursor-pointer" title={m.fileName || "Media"}>
                      {type === "image" && (
                        <img src={m.fileUrl} className="w-full h-full object-cover group-hover:opacity-80 transition" />
                      )}
                      {type === "video" && (
                        <div className="w-full h-full bg-[#1e293b] flex items-center justify-center group-hover:opacity-80 transition">
                          <PlaySquare className="w-6 h-6 text-white/50" />
                        </div>
                      )}
                      {(type === "pdf" || type === "file") && (
                        <div className="w-full h-full flex items-center justify-center bg-[#233138] group-hover:opacity-80 transition">
                          <FileText className="w-6 h-6 text-[#8696A0]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {mode === "info" && (
        <>
          {renderHeader("Contact Info")}
          <div className="flex-1 overflow-y-auto chat-scroll">
            <div className="bg-[#111B21] flex flex-col items-center py-6 px-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[#00A884] flex items-center justify-center mb-4 font-bold text-4xl text-white shadow-lg">
                {chatData?.image ? (
                  <img src={chatData.image} className="w-full h-full object-cover" />
                ) : (
                  chatData?.name?.[0]?.toUpperCase() || "C"
                )}
              </div>
              <h2 className="text-xl text-[#E9EDEF] font-medium text-center">{chatData?.name || "Group"}</h2>
              <p className="text-[#8696A0] text-sm mt-1">{chatData?.membersCount ? `${chatData.membersCount} members` : "Online"}</p>
            </div>

            <div className="h-2 bg-[#0B141A]"></div>

            {chatData?.description && (
              <div className="p-5 bg-[#111B21]">
                <p className="text-[#00A884] text-sm font-medium mb-1">Description</p>
                <p className="text-[#E9EDEF] text-sm break-words">{chatData.description}</p>
              </div>
            )}

            {chatData?.createdAt && (
              <div className="p-5 bg-[#111B21] flex items-center gap-4 border-t border-[#2A3942]/50">
                <Calendar className="w-5 h-5 text-[#8696A0]" />
                <span className="text-[#E9EDEF] text-sm">Created {format(new Date(chatData.createdAt), "dd/MM/yyyy")}</span>
              </div>
            )}

            {members && members.length > 0 && (
              <>
                <div className="h-2 bg-[#0B141A]"></div>
                <div className="p-5 bg-[#111B21]">
                  <p className="text-[#AEBAC1] text-sm font-medium mb-4 flex items-center gap-2">
                     <Users className="w-4 h-4" /> {members.length} participants
                  </p>
                  <div className="space-y-4">
                    {members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                          {member?.photoURL ? (
                            <img src={member.photoURL} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{member?.name?.[0]?.toUpperCase() || "U"}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[#E9EDEF] text-[15px]">{member?.name || member?.fullName || "User"}</span>
                           <span className="text-[#8696A0] text-xs capitalize">{member?.role || "Member"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
