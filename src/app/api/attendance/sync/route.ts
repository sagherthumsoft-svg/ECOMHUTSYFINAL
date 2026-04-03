import { NextResponse } from "next/server";
import { fetchHikvisionLogs } from "@/lib/hikvisionService";
import { syncAttendanceToFirebase } from "@/lib/attendanceService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startTime, endTime, officeId } = body;

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
    }

    // 1. Fetch raw logs from Hikvision
    const rawLogs = await fetchHikvisionLogs(startTime, endTime, officeId);

    // 2. Normalize data for Firebase sync
    const normalizedRecords = rawLogs.map((log) => {
      // Determine logical eventType from Hikvision attendanceStatus if possible
      // Defaults to 'check_in' if status is missing or ambiguous
      let eventType: "check_in" | "check_out" | "both" = "check_in";
      if (log.attendanceStatus.toLowerCase().includes("out")) {
        eventType = "check_out";
      } else if (log.attendanceStatus.toLowerCase().includes("in")) {
         eventType = "check_in";
      }

      return {
        employeeId: log.employeeNoString,
        name: log.name,
        timestamp: log.time,
        deviceId: log.doorNo.toString(),
        office: officeId || "Head Office",
        eventType: eventType,
      };
    });

    // 3. Batch save/sync to Firebase
    const syncResult = await syncAttendanceToFirebase(normalizedRecords);

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      stats: syncResult,
    });
  } catch (error: any) {
    console.error("Attendance Sync API Error:", error.message);
    return NextResponse.json(
      { error: "Failed to sync attendance data", details: error.message },
      { status: 500 }
    );
  }
}
