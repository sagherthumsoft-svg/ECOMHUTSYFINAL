export type UserRole = "owner" | "manager" | "head" | "team_member";

export interface User {
  uid: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  createdAt: number;
  createdBy?: string;
  photoURL?: string;
}

export type Chat = {
  chatId: string;
  memberIds: string[];
  type: "direct" | "group" | "warehouse";
  name?: string;
  description?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    text: string;
    createdAt: number;
    senderId: string;
    messageType: string;
  } | string;
  lastMessageTime?: number;
  lastMessageAt?: number;
  lastMessageSenderId?: string;
};

export interface Message {
  id?: string;
  messageId?: string;
  chatId?: string;
  senderId: string;
  senderName?: string;
  type?: "text" | "image" | "file" | "voice" | "pdf" | "video";
  messageType?: "text" | "image" | "file" | "voice" | "pdf" | "video";
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  duration?: number;
  readBy?: string[];
  createdAt: number;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  members?: string[];
  memberIds: string[];
  createdAt: number;
  createdBy: string;
  lastMessage?: string;
  lastMessageAt?: number;
}

export interface Warehouse {
  warehouseId: string;
  name: string;
  description: string;
  members?: string[];
  memberIds: string[];
  createdAt: number;
  createdBy: string;
  lastMessage?: string;
  lastMessageAt?: number;
}

export interface Announcement {
  announcementId: string;
  title: string;
  content: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
}

export type TaskStatus = "pending" | "in-progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  taskId: string;
  taskTitle: string;
  description?: string;
  assignedTo: string;        // single uid — matches Firestore rule
  assignedBy: string;
  status: TaskStatus;
  priority?: TaskPriority;
  deadline?: number;
  createdAt: number;
}

export interface Notification {
  id: string;
  receiverIds: string[];
  type: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  link?: string;
}
