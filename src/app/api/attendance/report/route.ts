import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { AttendanceRecord } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const office = searchParams.get("office");
    const employeeId = searchParams.get("employeeId");

    let query: FirebaseFirestore.Query = db.collection("attendance");

    if (date) {
      query = query.where("date", "==", date);
    }
    if (office) {
      query = query.where("office", "==", office);
    }
    if (employeeId) {
      query = query.where("employeeId", "==", employeeId);
    }

    const snapshot = await query.get();
    const records: AttendanceRecord[] = [];

    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
    });

    const summary = {
      totalPresent: records.filter((r) => r.status === "present").length,
      totalLate: records.filter((r) => r.status === "late").length,
      totalAbsent: records.filter((r) => r.status === "absent").length,
      totalLeave: records.filter((r) => r.status === "leave").length,
      totalRecords: records.length,
    };

    return NextResponse.json({
      success: true,
      records,
      summary,
    });
  } catch (error: any) {
    console.error("Attendance Report API Error:", error.message);
    return NextResponse.json(
      { error: "Failed to generate attendance report", details: error.message },
      { status: 500 }
    );
  }
}
