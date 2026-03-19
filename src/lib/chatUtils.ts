import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Chat } from "@/types";

/**
 * Ensures a direct chat exists between two users.
 * Returns the chatId of the existing or newly created chat.
 */
export async function ensureDirectChat(currentUid: string, otherUid: string): Promise<string> {
  if (!currentUid || !otherUid) throw new Error("Missing UIDs for direct chat");

  const chatsRef = collection(db, "chats");
  
  // 1. Check for existing direct chat
  const q = query(
    chatsRef,
    where("type", "==", "direct"),
    where("memberIds", "array-contains", currentUid)
  );

  const snapshot = await getDocs(q);
  const existingChatDoc = snapshot.docs.find((doc) => {
    const data = doc.data();
    const docMemberIds = data.memberIds || [];
    return (
      docMemberIds.length === 2 &&
      docMemberIds.includes(otherUid)
    );
  });

  if (existingChatDoc) {
    return existingChatDoc.id;
  }

  // 2. Create new chat if not found
  const memberIds = [currentUid, otherUid].sort();
  const newChatData = {
    memberIds,
    type: "direct",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: null,
    lastMessageSenderId: null,
  };

  const newChatRef = await addDoc(collection(db, "chats"), newChatData);
  return newChatRef.id;
}
