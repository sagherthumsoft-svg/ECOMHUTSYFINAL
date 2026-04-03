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

// ─── HR Module Types ────────────────────────────────────────────────────────

export type EmployeeStatus = "active" | "probation" | "inactive";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType = "sick" | "casual" | "annual" | "other";
export type AttendanceStatus = "present" | "absent" | "leave" | "late";
export type LoanStatus = "active" | "cleared";

export interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  fatherName: string;
  phone: string;
  email: string;
  cnic?: string;
  address: string;
  department: string;
  role: string;
  salary: number;
  joiningDate: string;
  status: EmployeeStatus;
  createdAt: number;
  createdBy: string;
}

export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  employeeName: string;
  date: string;         // "YYYY-MM-DD"
  status: AttendanceStatus;
  checkInTime?: string;  // "HH:MM"
  checkOutTime?: string; // "HH:MM"
  deviceId?: string;
  office?: string;
  eventType?: "check_in" | "check_out" | "both";
  createdAt: number;
  createdBy: string;
}

export interface PayrollRecord {
  id?: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  month: string;         // "YYYY-MM"
  baseSalary: number;
  leaveDays: number;
  lateDays: number;
  deductions: number;
  bonus: number;
  advanceDeduction: number;
  loanDeduction: number;
  finalSalary: number;
  createdAt: number;
  createdBy: string;
}

export interface Leave {
  id?: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: number;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface Notice {
  id?: string;
  title: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
}

export interface Loan {
  id?: string;
  employeeId: string;
  employeeName: string;
  type: "loan" | "advance";
  amount: number;
  installments: number;
  monthlyDeduction: number;
  remainingAmount: number;
  status: LoanStatus;
  startMonth: string;
  createdAt: number;
  createdBy: string;
}

export interface ActivityLog {
  id?: string;
  action: string;
  module: string;
  details: string;
  userId: string;
  userName?: string;
  createdAt: number;
}
