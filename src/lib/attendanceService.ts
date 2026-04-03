import { adminDb } from "./firebaseAdmin";
import { AttendanceRecord, AttendanceStatus } from "@/types";

interface SyncRecord {
  employeeId: string;
  name: string;
  timestamp: string; // ISO String
  deviceId: string;
  office: string;
  eventType: "check_in" | "check_out" | "both";
}

export const syncAttendanceToFirebase = async (records: SyncRecord[]) => {
  const batch = adminDb.batch();
  let added = 0;
  let updated = 0;

  for (const record of records) {
    // Determine exact date and time
    const dateObj = new Date(record.timestamp);
    const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); // HH:MM

    // Create custom unique ID string: employeeId_date
    const docId = `${record.employeeId}_${dateStr}`;
    const docRef = adminDb.collection("attendance").doc(docId);

    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
      const data = existingDoc.data() as AttendanceRecord;
      const updates: Partial<AttendanceRecord> = {};
      
      if (record.eventType === "check_in" && (!data.checkInTime || timeStr < data.checkInTime)) {
        updates.checkInTime = timeStr;
      } else if (record.eventType === "check_out" && (!data.checkOutTime || timeStr > data.checkOutTime)) {
        updates.checkOutTime = timeStr;
      } else if (record.eventType === "both") {
        if (!data.checkInTime || timeStr < data.checkInTime) updates.checkInTime = timeStr;
        if (!data.checkOutTime || timeStr > data.checkOutTime) updates.checkOutTime = timeStr;
      }
      
      // Determine late status (assuming threshold is 09:30 by default, ideally should be fetched from config)
      const threshold = "09:30"; // You can inject this from a global config if needed
      if (updates.checkInTime && updates.checkInTime > threshold && data.status !== "leave" && data.status !== "absent") {
          updates.status = "late";
      } else if (updates.checkInTime && data.status !== "leave" && data.status !== "absent") {
          updates.status = "present";
      }

      if (Object.keys(updates).length > 0) {
        batch.update(docRef, updates);
        updated++;
      }
    } else {
      // Determine late status
      const threshold = "09:30";
      let status: AttendanceStatus = "present";
      if (timeStr > threshold && record.eventType !== "check_out") {
          status = "late";
      }

      const newData: AttendanceRecord = {
        employeeId: record.employeeId,
        employeeName: record.name,
        date: dateStr,
        status: status,
        checkInTime: record.eventType === "check_in" || record.eventType === "both" ? timeStr : undefined,
        checkOutTime: record.eventType === "check_out" || record.eventType === "both" ? timeStr : undefined,
        deviceId: record.deviceId,
        office: record.office,
        createdAt: Date.now(),
        createdBy: "SYSTEM_SYNC",
      };

      batch.set(docRef, newData);
      added++;
    }
  }

  if (added > 0 || updated > 0) {
      await batch.commit();
  }

  return { added, updated };
};
